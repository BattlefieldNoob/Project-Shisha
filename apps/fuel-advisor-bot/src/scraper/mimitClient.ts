import { retry } from '@project-shisha/shared-lib'
import { logger } from '../config/logging'

/**
 * Custom error types for MIMIT client operations
 */
export class MimitClientError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'MimitClientError'
  }
}

export class MimitTimeoutError extends MimitClientError {
  constructor(url: string, timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms for URL: ${url}`,
      url,
      undefined,
      true
    )
    this.name = 'MimitTimeoutError'
  }
}

export class MimitNetworkError extends MimitClientError {
  constructor(url: string, originalError: Error) {
    super(
      `Network error downloading from ${url}: ${originalError.message}`,
      url,
      undefined,
      true
    )
    this.name = 'MimitNetworkError'
  }
}

export class MimitHttpError extends MimitClientError {
  constructor(url: string, statusCode: number) {
    const isRetryable = statusCode >= 500 || statusCode === 429
    super(
      `HTTP error ${statusCode} from ${url}${isRetryable ? ' (retryable)' : ''}`,
      url,
      statusCode,
      isRetryable
    )
    this.name = 'MimitHttpError'
  }
}

export interface MimitClientConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay between retries in ms (default: 1000) */
  retryDelayMs?: number
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number
  /** Maximum content size in bytes (default: 100MB) */
  maxContentSize?: number
}

const DEFAULT_CONFIG: Required<MimitClientConfig> = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  maxContentSize: 100 * 1024 * 1024,
}

export interface DownloadResult {
  content: string
  bytesDownloaded: number
  downloadTimeMs: number
  attempts: number
}

/**
 * Download MIMIT CSV with retry logic, timeout handling, and comprehensive error reporting
 */
export async function downloadMimitCsv(
  url: string,
  clientConfig: MimitClientConfig = {}
): Promise<DownloadResult> {
  const cfg = { ...DEFAULT_CONFIG, ...clientConfig }
  let attempts = 0
  const startTime = Date.now()

  logger.info(`Downloading MIMIT CSV from ${url}...`)

  const operation = async (): Promise<string> => {
    attempts++

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs)

    try {
      logger.debug(`Fetch attempt ${attempts}/${cfg.maxRetries + 1}`, { url })

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
          'User-Agent': 'Project-Shisha-FuelAdvisor/1.0',
        },
      })

      clearTimeout(timeoutId)

      // Check HTTP status
      if (!response.ok) {
        throw new MimitHttpError(url, response.status)
      }

      // Check content length if available
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const size = parseInt(contentLength, 10)
        if (size > cfg.maxContentSize) {
          throw new MimitClientError(
            `Content too large: ${size} bytes exceeds limit of ${cfg.maxContentSize} bytes`,
            url,
            undefined,
            false
          )
        }
      }

      // Read content
      const text = await response.text()

      // Validate content
      if (!text || text.trim().length === 0) {
        throw new MimitClientError(
          'Received empty response body',
          url,
          response.status,
          true
        )
      }

      // Validate it looks like CSV (has at least some content)
      if (text.length < 10) {
        throw new MimitClientError(
          `Response too short (${text.length} bytes), may not be valid CSV`,
          url,
          response.status,
          true
        )
      }

      return text
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        // Handle abort (timeout)
        if (error.name === 'AbortError') {
          throw new MimitTimeoutError(url, cfg.timeoutMs)
        }
        // Re-throw our custom errors
        if (error instanceof MimitClientError) {
          throw error
        }
        // Wrap other errors
        throw new MimitNetworkError(url, error)
      }

      throw new MimitClientError(`Unknown error: ${String(error)}`, url)
    }
  }

  try {
    // Wrap with retry logic using shared-lib
    const content = await retry(operation, {
      maxAttempts: cfg.maxRetries + 1,
      delayMs: cfg.retryDelayMs,
      backoff: 2,
      onRetry: (attempt, error) => {
        const isRetryable = error instanceof MimitClientError && error.isRetryable
        logger.warn(
          `Retry ${attempt}/${cfg.maxRetries}${isRetryable ? ' (retryable error)' : ''}: ${error.message}`,
          { url }
        )
      },
    })

    const downloadTimeMs = Date.now() - startTime

    logger.info(`Downloaded ${content.length} bytes from ${url} in ${downloadTimeMs}ms (${attempts} attempt(s))`)

    return {
      content,
      bytesDownloaded: content.length,
      downloadTimeMs,
      attempts,
    }
  } catch (finalError) {
    const downloadTimeMs = Date.now() - startTime

    if (finalError instanceof MimitClientError) {
      logger.error('Failed to download MIMIT CSV after all retries', {
        url,
        attempts,
        totalTimeMs: downloadTimeMs,
        error: finalError.message,
        statusCode: finalError.statusCode,
        isRetryable: finalError.isRetryable,
      })
    } else {
      logger.error('Unexpected error downloading MIMIT CSV', {
        url,
        attempts,
        totalTimeMs: downloadTimeMs,
        error: finalError instanceof Error ? finalError.message : String(finalError),
      })
    }

    throw finalError
  }
}

// Keep backwards compatibility with simple API
export async function downloadMimitCsvSimple(url: string): Promise<string> {
  const result = await downloadMimitCsv(url)
  return result.content
}
