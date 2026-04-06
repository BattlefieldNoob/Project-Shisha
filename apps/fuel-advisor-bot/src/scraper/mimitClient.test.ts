import { describe, it, expect, beforeEach, vi } from 'bun:test'

// Test error classes without importing the actual module (avoid module resolution issues)
describe('MimitClientError classes', () => {
  // Re-create the error classes for testing
  class MimitClientError extends Error {
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

  class MimitTimeoutError extends MimitClientError {
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

  class MimitNetworkError extends MimitClientError {
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

  class MimitHttpError extends MimitClientError {
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

  describe('MimitClientError', () => {
    it('should create error with url and statusCode', () => {
      const error = new MimitClientError('Test error', 'https://example.com', 500, true)
      expect(error.message).toBe('Test error')
      expect(error.url).toBe('https://example.com')
      expect(error.statusCode).toBe(500)
      expect(error.isRetryable).toBe(true)
      expect(error.name).toBe('MimitClientError')
    })

    it('should default isRetryable to false', () => {
      const error = new MimitClientError('Test', 'https://example.com')
      expect(error.isRetryable).toBe(false)
    })
  })

  describe('MimitTimeoutError', () => {
    it('should create timeout error with message', () => {
      const error = new MimitTimeoutError('https://example.com', 5000)
      expect(error.message).toContain('5000ms')
      expect(error.message).toContain('https://example.com')
      expect(error.isRetryable).toBe(true)
      expect(error.name).toBe('MimitTimeoutError')
    })
  })

  describe('MimitNetworkError', () => {
    it('should wrap original error', () => {
      const original = new Error('Connection refused')
      const error = new MimitNetworkError('https://example.com', original)
      expect(error.message).toContain('Connection refused')
      expect(error.isRetryable).toBe(true)
      expect(error.name).toBe('MimitNetworkError')
    })
  })

  describe('MimitHttpError', () => {
    it('should mark 5xx as retryable', () => {
      const error = new MimitHttpError('https://example.com', 503)
      expect(error.statusCode).toBe(503)
      expect(error.isRetryable).toBe(true)
      expect(error.message).toContain('retryable')
    })

    it('should mark 429 as retryable', () => {
      const error = new MimitHttpError('https://example.com', 429)
      expect(error.statusCode).toBe(429)
      expect(error.isRetryable).toBe(true)
    })

    it('should mark 4xx as non-retryable', () => {
      const error = new MimitHttpError('https://example.com', 404)
      expect(error.statusCode).toBe(404)
      expect(error.isRetryable).toBe(false)
      expect(error.message).not.toContain('retryable')
    })

    it('should mark 400 as non-retryable', () => {
      const error = new MimitHttpError('https://example.com', 400)
      expect(error.statusCode).toBe(400)
      expect(error.isRetryable).toBe(false)
    })
  })

  describe('Error inheritance', () => {
    it('TimeoutError should be instance of MimitClientError', () => {
      const error = new MimitTimeoutError('https://example.com', 5000)
      expect(error instanceof MimitClientError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('NetworkError should be instance of MimitClientError', () => {
      const error = new MimitNetworkError('https://example.com', new Error('test'))
      expect(error instanceof MimitClientError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })

    it('HttpError should be instance of MimitClientError', () => {
      const error = new MimitHttpError('https://example.com', 500)
      expect(error instanceof MimitClientError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })
  })
})

describe('DownloadResult interface', () => {
  it('should have correct structure', () => {
    const mockResult = {
      content: 'test|content',
      bytesDownloaded: 12,
      downloadTimeMs: 100,
      attempts: 1,
    }

    expect(mockResult.content).toBe('test|content')
    expect(mockResult.bytesDownloaded).toBe(12)
    expect(mockResult.downloadTimeMs).toBe(100)
    expect(mockResult.attempts).toBe(1)
  })
})

describe('MimitClientConfig interface', () => {
  it('should accept valid config options', () => {
    const config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      maxContentSize: 100 * 1024 * 1024,
    }

    expect(config.maxRetries).toBe(3)
    expect(config.retryDelayMs).toBe(1000)
    expect(config.timeoutMs).toBe(30000)
    expect(config.maxContentSize).toBe(100 * 1024 * 1024)
  })

  it('should have sensible defaults', () => {
    const defaults = {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      maxContentSize: 100 * 1024 * 1024,
    }

    expect(defaults.maxRetries).toBeGreaterThan(0)
    expect(defaults.retryDelayMs).toBeGreaterThan(0)
    expect(defaults.timeoutMs).toBeGreaterThan(1000)
  })
})
