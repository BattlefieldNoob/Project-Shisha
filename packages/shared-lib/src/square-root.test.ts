import { describe, expect, it } from 'bun:test';
import { sqrt, isPerfectSquare } from './square-root';

describe('sqrt', () => {
  it('should compute square root of 0', () => {
    expect(sqrt(0)).toBe(0);
  });

  it('should compute square root of 1', () => {
    expect(sqrt(1)).toBe(1);
  });

  it('should compute square root of perfect squares', () => {
    expect(sqrt(4)).toBeCloseTo(2, 10);
    expect(sqrt(9)).toBeCloseTo(3, 10);
    expect(sqrt(16)).toBeCloseTo(4, 10);
    expect(sqrt(25)).toBeCloseTo(5, 10);
    expect(sqrt(100)).toBeCloseTo(10, 10);
  });

  it('should compute square root of non-perfect squares', () => {
    expect(sqrt(2)).toBeCloseTo(1.4142135624, 8);
    expect(sqrt(3)).toBeCloseTo(1.7320508076, 8);
    expect(sqrt(5)).toBeCloseTo(2.2360679775, 8);
  });

  it('should compute square root of decimal numbers', () => {
    expect(sqrt(0.25)).toBeCloseTo(0.5, 10);
    expect(sqrt(0.01)).toBeCloseTo(0.1, 10);
  });

  it('should throw error for negative numbers', () => {
    expect(() => sqrt(-1)).toThrow('Cannot compute square root of a negative number');
    expect(() => sqrt(-4)).toThrow('Cannot compute square root of a negative number');
  });

  it('should handle large numbers', () => {
    expect(sqrt(1000000)).toBeCloseTo(1000, 10);
    expect(sqrt(100000000)).toBeCloseTo(10000, 10);
  });

  it('should respect precision parameter', () => {
    const result = sqrt(2, 15);
    expect(result).toBeCloseTo(1.414213562373095, 12);
  });
});

describe('isPerfectSquare', () => {
  it('should return true for perfect squares', () => {
    expect(isPerfectSquare(0)).toBe(true);
    expect(isPerfectSquare(1)).toBe(true);
    expect(isPerfectSquare(4)).toBe(true);
    expect(isPerfectSquare(9)).toBe(true);
    expect(isPerfectSquare(16)).toBe(true);
    expect(isPerfectSquare(25)).toBe(true);
    expect(isPerfectSquare(100)).toBe(true);
  });

  it('should return false for non-perfect squares', () => {
    expect(isPerfectSquare(2)).toBe(false);
    expect(isPerfectSquare(3)).toBe(false);
    expect(isPerfectSquare(5)).toBe(false);
    expect(isPerfectSquare(10)).toBe(false);
  });

  it('should return false for negative numbers', () => {
    expect(isPerfectSquare(-1)).toBe(false);
    expect(isPerfectSquare(-4)).toBe(false);
  });
});
