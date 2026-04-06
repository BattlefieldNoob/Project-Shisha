import { describe, it, expect } from 'bun:test'
import { calculateAdvice } from './rules'
import type { AdviceDetails } from './types'

describe('calculateAdvice', () => {
  // Helper to create base stats with defaults
  const createStats = (overrides: Partial<AdviceDetails> = {}): AdviceDetails => ({
    todayPrice: 1.65,
    mean15d: 1.65,
    stddev15d: 0.05,
    deltaVsMean15d: 0,
    trend3d: 0,
    sampleSize: 15,
    ...overrides
  })

  describe('insufficient data handling', () => {
    it('should fallback to level-based logic when sample size is 0', () => {
      const stats = createStats({ sampleSize: 0, todayPrice: null })
      
      const result = calculateAdvice(stats, 0.1)
      
      expect(result.action).toBe('FILL')
    })

    it('should fallback to level-based logic when sample size is 1', () => {
      const stats = createStats({ sampleSize: 1 })
      
      const result = calculateAdvice(stats, 0.35)
      
      expect(result.action).toBe('HALF')
    })

    it('should fallback to level-based logic when sample size is 2', () => {
      const stats = createStats({ sampleSize: 2 })
      
      const result = calculateAdvice(stats, 0.6)
      
      expect(result.action).toBe('WAIT')
    })

    it('should use price-based logic when sample size is 3 or more', () => {
      const stats = createStats({ sampleSize: 3, deltaVsMean15d: 0.10 })
      
      const result = calculateAdvice(stats, 0.6)
      
      expect(result.action).toBe('WAIT')
      expect(result.reasons).toContain('TODAY_PRICE_HIGH_VS_HISTORY')
    })

    it('should fallback when todayPrice is null regardless of sample size', () => {
      const stats = createStats({ todayPrice: null })
      
      const result = calculateAdvice(stats, 0.35)
      
      expect(result.action).toBe('HALF')
    })
  })

  describe('tank level thresholds', () => {
    it('should suggest FILL when tank < 25% with insufficient data', () => {
      const stats = createStats({ sampleSize: 2 })
      
      const result = calculateAdvice(stats, 0.2)
      
      expect(result.action).toBe('FILL')
    })

    it('should suggest HALF when tank 25-50% with insufficient data', () => {
      const stats = createStats({ sampleSize: 2 })
      
      const result = calculateAdvice(stats, 0.35)
      
      expect(result.action).toBe('HALF')
    })

    it('should suggest WAIT when tank >= 50% with insufficient data', () => {
      const stats = createStats({ sampleSize: 2 })
      
      const result = calculateAdvice(stats, 0.5)
      
      expect(result.action).toBe('WAIT')
      // No reason because it's a fallback path, not a post-check path
      expect(result.reasons).toHaveLength(0)
    })

    it('should suggest WAIT when tank >= 90% even with good price', () => {
      const stats = createStats({
        deltaVsMean15d: -0.10,
        trend3d: -0.02,
      })
      
      const result = calculateAdvice(stats, 0.95)
      
      // With level 0.95 and low price, initially FILL, but 0.95 >= 0.9 so overridden to WAIT
      expect(result.action).toBe('WAIT')
    })
  })

  describe('price patterns - low price scenarios', () => {
    it('should advise FILL when price is significantly lower than average', () => {
      const stats = createStats({
        deltaVsMean15d: -0.08,
        trend3d: 0
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      expect(result.action).toBe('FILL')
      expect(result.reasons).toContain('TODAY_PRICE_LOW_VS_HISTORY')
    })

    it('should add FALLING_TREND reason when trend is negative', () => {
      const stats = createStats({
        deltaVsMean15d: -0.08,
        trend3d: -0.03
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      expect(result.reasons).toContain('FALLING_TREND')
    })

    it('should suggest WAIT when tank >= 80% with low price', () => {
      const stats = createStats({
        deltaVsMean15d: -0.08,
        trend3d: 0
      })
      
      const result = calculateAdvice(stats, 0.85)
      
      // With level 0.85 and low price:
      // 1. delta <= -stddev (-0.05), so low price branch
      // 2. level (0.85) >= 0.8, so initial action = HALF
      // 3. Post-check: HALF >= 0.5? Yes, so overridden to WAIT
      expect(result.action).toBe('WAIT')
    })

  })

  describe('price patterns - high price scenarios', () => {
    it('should advise WAIT when price is significantly higher and rising', () => {
      const stats = createStats({
        deltaVsMean15d: 0.10,
        trend3d: 0.05,
        mean15d: 1.65,
        stddev15d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.6)
      
      expect(result.action).toBe('WAIT')
      expect(result.reasons).toContain('TODAY_PRICE_HIGH_VS_HISTORY')
      expect(result.reasons).toContain('RISING_TREND')
    })

    it('should advise MINIMUM when price is high and rising but tank is low (<= 0.4)', () => {
      const stats = createStats({
        deltaVsMean15d: 0.10,
        trend3d: 0.05,
        mean15d: 1.65,
        stddev15d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.2)
      
      expect(result.action).toBe('MINIMUM')
    })

    it('should advise MINIMUM when price is high but falling', () => {
      const stats = createStats({
        deltaVsMean15d: 0.10,
        trend3d: -0.02,
        mean15d: 1.65,
        stddev15d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.2)
      
      expect(result.action).toBe('MINIMUM')
    })

    it('should advise WAIT when price is high but tank is adequate', () => {
      const stats = createStats({
        deltaVsMean15d: 0.10,
        trend3d: -0.02,
        mean15d: 1.65,
        stddev15d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      expect(result.action).toBe('WAIT')
    })
  })

  describe('price patterns - near average scenarios', () => {
    it('should advise FILL when price is below average and tank is low', () => {
      const stats = createStats({
        deltaVsMean15d: -0.02,
        trend3d: 0
      })
      
      const result = calculateAdvice(stats, 0.2)
      
      expect(result.action).toBe('FILL')
      expect(result.reasons).toContain('NEAR_AVERAGE_STABLE')
    })

    it('should advise HALF when price is above average and tank is low', () => {
      const stats = createStats({
        deltaVsMean15d: 0.02,
        trend3d: 0
      })
      
      const result = calculateAdvice(stats, 0.2)
      
      expect(result.action).toBe('HALF')
      expect(result.reasons).toContain('NEAR_AVERAGE_STABLE')
    })

    it('should advise WAIT when price is near average and tank is adequate', () => {
      const stats = createStats({
        deltaVsMean15d: 0.01,
        trend3d: 0
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      expect(result.action).toBe('WAIT')
    })
  })

  describe('edge cases with zero or near-zero stddev', () => {
    it('should handle zero standard deviation - price below mean', () => {
      const stats = createStats({
        stddev15d: 0,
        deltaVsMean15d: -0.01 // Negative delta
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      // With zero stddev: lowThreshold = highThreshold = 0
      // delta (-0.01) <= 0 is true, so low price branch
      expect(result.reasons).toContain('TODAY_PRICE_LOW_VS_HISTORY')
    })

    it('should handle null stddev (treat as 0)', () => {
      const stats = createStats({
        stddev15d: null as any,
        deltaVsMean15d: 0.01 // Slightly above mean
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      // delta (0.01) >= 0 is true, so high price branch (rising = false since 0.01 > 0)
      // Actually trend is 0 by default, and 0 > 0 is false, so falling branch
      // level 0.5 >= 0.25, so MINIMUM overridden to WAIT
      expect(result.action).toBe('WAIT')
    })

    it('should handle null trend (treat as 0)', () => {
      const stats = createStats({
        trend3d: null as any,
        deltaVsMean15d: 0.10,
        mean15d: 1.65,
        stddev15d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      // With null trend (treated as 0), high price but not rising
      // level 0.5 >= 0.25, so MINIMUM overridden to WAIT
      expect(result.action).toBe('WAIT')
    })
  })

  describe('boundary conditions', () => {
    it('should handle exactly at low threshold', () => {
      const stats = createStats({
        stddev15d: 0.05,
        deltaVsMean15d: -0.05
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      // delta <= lowThreshold means -0.05 <= -0.05 is true
      expect(result.action).toBe('FILL')
    })

    it('should handle exactly at high threshold', () => {
      const stats = createStats({
        stddev15d: 0.05,
        deltaVsMean15d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      // delta >= highThreshold means 0.05 >= 0.05 is true
      expect(result.reasons).toContain('TODAY_PRICE_HIGH_VS_HISTORY')
    })

    it('should handle exactly at 0.25 tank level (boundary for FILL)', () => {
      const stats = createStats({ sampleSize: 2 })
      
      const result = calculateAdvice(stats, 0.25)
      
      // 0.25 is not < 0.25, so no FILL
      // 0.25 is < 0.5, so HALF
      expect(result.action).toBe('HALF')
    })

    it('should handle exactly at 0.5 tank level (WAIT boundary for HALF)', () => {
      const stats = createStats({
        deltaVsMean15d: -0.08,
        trend3d: -0.02
      })
      
      const result = calculateAdvice(stats, 0.5)
      
      // With level 0.5 and low price:
      // 1. delta (-0.08) <= -0.05 (lowThreshold), so low price branch
      // 2. level (0.5) < 0.8, so initial action = FILL
      // 3. Post-check: FILL >= 0.9? No (0.5 < 0.9), so stays FILL
      expect(result.action).toBe('FILL')
    })
  })

  describe('MINIMUM action constraints', () => {
    it('should override MINIMUM with WAIT when level >= 0.25', () => {
      const stats = createStats({
        deltaVsMean15d: 0.10,
        trend3d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.3)
      
      // level 0.3 is >= 0.25, MINIMUM overridden to WAIT
      expect(result.action).toBe('WAIT')
      expect(result.reasons).toContain('SUFFICIENT_LEVEL_FOR_NOW')
    })
  })

  describe('comprehensive scenarios', () => {
    it('scenario: Good price, low tank, falling trend -> FILL', () => {
      const stats = createStats({
        deltaVsMean15d: -0.10,
        trend3d: -0.05
      })
      
      const result = calculateAdvice(stats, 0.4)
      
      expect(result.action).toBe('FILL')
      expect(result.reasons).toContain('TODAY_PRICE_LOW_VS_HISTORY')
      expect(result.reasons).toContain('FALLING_TREND')
    })

    it('scenario: Bad price, rising trend, adequate tank -> WAIT', () => {
      const stats = createStats({
        deltaVsMean15d: 0.10,
        trend3d: 0.05
      })
      
      const result = calculateAdvice(stats, 0.6)
      
      expect(result.action).toBe('WAIT')
      expect(result.reasons).toContain('TODAY_PRICE_HIGH_VS_HISTORY')
      expect(result.reasons).toContain('RISING_TREND')
    })

    it('scenario: Average price, stable tank -> WAIT', () => {
      const stats = createStats({
        deltaVsMean15d: 0.01,
        trend3d: 0
      })
      
      const result = calculateAdvice(stats, 0.6)
      
      expect(result.action).toBe('WAIT')
      expect(result.reasons).toContain('NEAR_AVERAGE_STABLE')
    })

    it('scenario: High price, falling trend, low tank -> MINIMUM', () => {
      const stats = createStats({
        deltaVsMean15d: 0.08,
        trend3d: -0.03
      })
      
      const result = calculateAdvice(stats, 0.15)
      
      expect(result.action).toBe('MINIMUM')
    })
  })
})
