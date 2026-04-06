import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { getAdvice } from './advisor'
import type { AdviceInput } from './types'

// Mock the database module
const mockGetLast15DaysPrices = vi.fn()
vi.mock('../db/index', () => ({
  getLast15DaysPrices: mockGetLast15DaysPrices
}))

// Mock the logging module
vi.mock('../config/logging', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('getAdvice', () => {
  const baseInput: AdviceInput = {
    stationId: 1,
    fuelType: 'DIESEL',
    level: 0.5
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('with sufficient historical data (15 days)', () => {
    it('should return correct analysis when price is lower than average', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.50 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 },
        { date: '2026-04-04', price_eur_per_liter: 1.63 },
        { date: '2026-04-03', price_eur_per_liter: 1.62 },
        { date: '2026-04-02', price_eur_per_liter: 1.65 },
        { date: '2026-04-01', price_eur_per_liter: 1.64 },
        { date: '2026-03-31', price_eur_per_liter: 1.66 },
        { date: '2026-03-30', price_eur_per_liter: 1.65 },
        { date: '2026-03-29', price_eur_per_liter: 1.64 },
        { date: '2026-03-28', price_eur_per_liter: 1.63 },
        { date: '2026-03-27', price_eur_per_liter: 1.65 },
        { date: '2026-03-26', price_eur_per_liter: 1.64 },
        { date: '2026-03-25', price_eur_per_liter: 1.63 },
        { date: '2026-03-24', price_eur_per_liter: 1.65 },
        { date: '2026-03-23', price_eur_per_liter: 1.64 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice({ ...baseInput, level: 0.3 })

      expect(result.details.sampleSize).toBe(15)
      expect(result.details.todayPrice).toBe(1.50)
      expect(result.details.deltaVsMean15d).toBeLessThan(0)
      expect(result.details.trend3d).toBeLessThan(0)
    })

    it('should return correct analysis when price is higher than average', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.80 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 },
        { date: '2026-04-04', price_eur_per_liter: 1.63 },
        { date: '2026-04-03', price_eur_per_liter: 1.62 },
        { date: '2026-04-02', price_eur_per_liter: 1.65 },
        { date: '2026-04-01', price_eur_per_liter: 1.64 },
        { date: '2026-03-31', price_eur_per_liter: 1.66 },
        { date: '2026-03-30', price_eur_per_liter: 1.65 },
        { date: '2026-03-29', price_eur_per_liter: 1.64 },
        { date: '2026-03-28', price_eur_per_liter: 1.63 },
        { date: '2026-03-27', price_eur_per_liter: 1.65 },
        { date: '2026-03-26', price_eur_per_liter: 1.64 },
        { date: '2026-03-25', price_eur_per_liter: 1.63 },
        { date: '2026-03-24', price_eur_per_liter: 1.65 },
        { date: '2026-03-23', price_eur_per_liter: 1.64 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.sampleSize).toBe(15)
      expect(result.details.todayPrice).toBe(1.80)
      expect(result.details.deltaVsMean15d).toBeGreaterThan(0)
    })

    it('should calculate standard deviation correctly for stable prices', async () => {
      const prices = Array.from({ length: 15 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price_eur_per_liter: 1.65
      }))
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.stddev15d).toBeLessThan(0.0001)
      expect(result.details.mean15d).toBeCloseTo(1.65, 10)
    })
  })

  describe('edge cases - insufficient data', () => {
    it('should handle empty historical data', async () => {
      mockGetLast15DaysPrices.mockReturnValue([])

      const result = await getAdvice(baseInput)

      expect(result.details.sampleSize).toBe(0)
      expect(result.details.todayPrice).toBeNull()
      expect(result.details.mean15d).toBeNull()
      expect(result.details.stddev15d).toBeNull()
      expect(result.details.deltaVsMean15d).toBeNull()
      expect(result.details.trend3d).toBeNull()
    })

    it('should handle sample size of 1', async () => {
      const prices = [{ date: '2026-04-06', price_eur_per_liter: 1.65 }]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.sampleSize).toBe(1)
      expect(result.details.todayPrice).toBe(1.65)
      expect(result.details.mean15d).toBeCloseTo(1.65, 10)
      expect(result.details.stddev15d).toBeLessThan(0.0001)
    })

    it('should handle sample size of 2', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.70 },
        { date: '2026-04-05', price_eur_per_liter: 1.60 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.sampleSize).toBe(2)
      expect(result.details.todayPrice).toBe(1.70)
      expect(result.details.mean15d).toBeCloseTo(1.65, 10)
      expect(result.details.stddev15d).toBeCloseTo(0.05, 10)
    })

    it('should handle sample size of exactly 3 (minimum for full analysis)', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.70 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 },
        { date: '2026-04-04', price_eur_per_liter: 1.60 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.sampleSize).toBe(3)
      expect(result.details.todayPrice).toBe(1.70)
      expect(result.details.trend3d).toBeCloseTo(0.10, 10)
    })
  })

  describe('tank level thresholds', () => {
    it('should suggest FILL when tank is empty (level < 0.25) with no data', async () => {
      mockGetLast15DaysPrices.mockReturnValue([])

      const result = await getAdvice({ ...baseInput, level: 0.1 })

      expect(result.action).toBe('FILL')
    })

    it('should suggest HALF when tank is at 25-50% with no data', async () => {
      mockGetLast15DaysPrices.mockReturnValue([])

      const result = await getAdvice({ ...baseInput, level: 0.35 })

      expect(result.action).toBe('HALF')
    })

    it('should suggest WAIT when tank is > 50% with no data', async () => {
      mockGetLast15DaysPrices.mockReturnValue([])

      const result = await getAdvice({ ...baseInput, level: 0.6 })

      expect(result.action).toBe('WAIT')
    })

    it('should suggest WAIT when tank is at exactly 50% with no data', async () => {
      mockGetLast15DaysPrices.mockReturnValue([])

      const result = await getAdvice({ ...baseInput, level: 0.5 })

      expect(result.action).toBe('WAIT')
    })
  })

  describe('trend calculations', () => {
    it('should calculate positive trend correctly (prices rising)', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.70 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 },
        { date: '2026-04-04', price_eur_per_liter: 1.60 },
        { date: '2026-04-03', price_eur_per_liter: 1.55 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.trend3d).toBeGreaterThan(0)
    })

    it('should calculate negative trend correctly (prices falling)', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.50 },
        { date: '2026-04-05', price_eur_per_liter: 1.55 },
        { date: '2026-04-04', price_eur_per_liter: 1.60 },
        { date: '2026-04-03', price_eur_per_liter: 1.65 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.trend3d).toBeLessThan(0)
    })

    it('should use oldest available when fewer than 4 days of data', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.70 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.trend3d).toBeCloseTo(0.05, 10)
    })
  })

  describe('different fuel types', () => {
    it('should handle GASOLINE fuel type', async () => {
      const prices = Array.from({ length: 5 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price_eur_per_liter: 1.75 + i * 0.01
      }))
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice({ ...baseInput, fuelType: 'GASOLINE' })

      expect(result.details.sampleSize).toBe(5)
    })

    it('should handle DIESEL fuel type', async () => {
      const prices = Array.from({ length: 5 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price_eur_per_liter: 1.55 + i * 0.01
      }))
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice({ ...baseInput, fuelType: 'DIESEL' })

      expect(result.details.sampleSize).toBe(5)
    })
  })

  describe('error handling', () => {
    it('should return fallback advice when database throws error', async () => {
      mockGetLast15DaysPrices.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await getAdvice({ ...baseInput, level: 0.1 })

      expect(result.action).toBe('FILL')
      expect(result.details.sampleSize).toBe(0)
      expect(result.details.todayPrice).toBeNull()
    })

    it('should return WAIT as fallback when tank level is adequate and DB fails', async () => {
      mockGetLast15DaysPrices.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await getAdvice({ ...baseInput, level: 0.5 })

      expect(result.action).toBe('WAIT')
      expect(result.details.sampleSize).toBe(0)
    })
  })

  describe('mean and delta calculations', () => {
    it('should calculate correct mean for various price patterns', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.60 },
        { date: '2026-04-05', price_eur_per_liter: 1.70 },
        { date: '2026-04-04', price_eur_per_liter: 1.50 },
        { date: '2026-04-03', price_eur_per_liter: 1.80 },
        { date: '2026-04-02', price_eur_per_liter: 1.40 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      expect(result.details.mean15d).toBeCloseTo(1.60, 10)
      expect(result.details.deltaVsMean15d).toBeCloseTo(0, 10)
    })

    it('should calculate correct positive delta', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.80 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 },
        { date: '2026-04-04', price_eur_per_liter: 1.65 },
        { date: '2026-04-03', price_eur_per_liter: 1.65 },
        { date: '2026-04-02', price_eur_per_liter: 1.65 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      // Mean = (1.80 + 1.65*4) / 5 = 7.40 / 5 = 1.68
      expect(result.details.mean15d).toBeCloseTo(1.68, 10)
      // Delta = 1.80 - 1.68 = 0.12
      expect(result.details.deltaVsMean15d).toBeCloseTo(0.12, 10)
    })

    it('should calculate correct negative delta', async () => {
      const prices = [
        { date: '2026-04-06', price_eur_per_liter: 1.40 },
        { date: '2026-04-05', price_eur_per_liter: 1.65 },
        { date: '2026-04-04', price_eur_per_liter: 1.65 },
        { date: '2026-04-03', price_eur_per_liter: 1.65 },
        { date: '2026-04-02', price_eur_per_liter: 1.65 }
      ]
      mockGetLast15DaysPrices.mockReturnValue(prices)

      const result = await getAdvice(baseInput)

      // Mean = (1.40 + 1.65*4) / 5 = 8.0 / 5 = 1.60
      // Delta = 1.40 - 1.60 = -0.20
      expect(result.details.deltaVsMean15d).toBeCloseTo(-0.20, 10)
    })
  })
})
