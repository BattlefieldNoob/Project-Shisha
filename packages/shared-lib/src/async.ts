/**
 * Async utilities
 */

/**
 * Options for retry operations
 */
export interface RetryOptions {
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Delay between attempts in milliseconds */
  delayMs: number;
  /** Exponential backoff multiplier */
  backoff?: number;
  /** Function to call on each attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Options for timeout operations
 */
export interface TimeoutOptions {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Error message for timeout */
  errorMessage?: string;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < options.maxAttempts) {
        const delay = options.delayMs * Math.pow(options.backoff ?? 1, attempt - 1);
        if (options.onRetry) {
          options.onRetry(attempt, lastError);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Wrap a promise with a timeout
 */
export async function timeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(options.errorMessage ?? `Operation timed out after ${options.timeoutMs}ms`));
    }, options.timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}