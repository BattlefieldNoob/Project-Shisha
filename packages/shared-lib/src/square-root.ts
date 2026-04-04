/**
 * Compute the square root of a number using the Newton-Raphson method.
 * This implementation doesn't use any external libraries.
 * 
 * @param n - The number to compute the square root of (must be non-negative)
 * @param precision - The number of decimal places for the result (default: 10)
 * @param maxIterations - Maximum number of iterations (default: 1000)
 * @returns The square root of n
 * @throws Error if n is negative
 */
export function sqrt(
  n: number,
  precision: number = 10,
  maxIterations: number = 1000
): number {
  if (n < 0) {
    throw new Error("Cannot compute square root of a negative number");
  }

  if (n === 0 || n === 1) {
    return n;
  }

  // Initial guess
  let x = n;
  let root: number;
  const epsilon = Math.pow(10, -precision);

  for (let i = 0; i < maxIterations; i++) {
    root = (x + n / x) / 2;
    
    // Check for convergence
    if (Math.abs(root - x) < epsilon) {
      break;
    }
    
    x = root;
  }

  return root;
}

/**
 * Check if a number is a perfect square.
 * 
 * @param n - The number to check
 * @returns true if n is a perfect square, false otherwise
 */
export function isPerfectSquare(n: number): boolean {
  if (n < 0) {
    return false;
  }
  
  const root = sqrt(n);
  return Math.floor(root) === root;
}
