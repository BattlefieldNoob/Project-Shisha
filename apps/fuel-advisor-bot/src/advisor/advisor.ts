import { logger } from '../config/logging'
import { getLast15DaysPrices } from '../db/index'
import { AdviceInput, AdviceOutput, AdviceDetails } from './types'
import { calculateAdvice } from './rules'

export async function getAdvice(input: AdviceInput): Promise<AdviceOutput> {
  try {
    const historicalPrices = getLast15DaysPrices(input.stationId, input.fuelType)

    // Sort array by date string assuming it's ISO format, oldest first or newest first?
    // getLast15DaysPrices returns DESC (newest first).
    // Let's ensure prices is purely an array of numbers representing newest to oldest
    const priceValues = historicalPrices.map(p => p.price_eur_per_liter)
    const _dates = historicalPrices.map(p => p.date)

    const sampleSize = historicalPrices.length

    let todayPrice: number | null = null
    let mean15d: number | null = null
    let stddev15d: number | null = null
    let deltaVsMean15d: number | null = null
    let trend3d: number | null = null

    if (sampleSize > 0) {
      // Assuming index 0 is today or the most recent available day
      todayPrice = priceValues[0]

      // Mean
      const sum = priceValues.reduce((a, b) => a + b, 0)
      mean15d = sum / sampleSize

      // Standard Deviation
      if (sampleSize > 1) {
        const variance = priceValues.reduce((acc, val) => acc + Math.pow(val - mean15d!, 2), 0) / sampleSize
        stddev15d = Math.sqrt(variance)
      } else {
        stddev15d = 0
      }

      deltaVsMean15d = todayPrice - mean15d

      // Trend 3d: Today vs 3 days ago
      // Find the price from 3 days ago. If not exactly 3 days, pick the oldest available within the 3 day window.
      // Since it's sorted DESC, index 0 is day 0, index 1 is day -1, index 2 is day -2, index 3 is day -3.
      // We'll just take index 3 if available, else the last element if sampleSize < 4.
      const trendIndex = Math.min(3, sampleSize - 1)
      const pastPrice = priceValues[trendIndex]
      trend3d = todayPrice - pastPrice
    }

    const details: AdviceDetails = {
      todayPrice,
      mean15d,
      stddev15d,
      deltaVsMean15d,
      trend3d,
      sampleSize
    }

    const { action, reasons } = calculateAdvice(details, input.level)

    return {
      action,
      reasons,
      details
    }
  } catch (err) {
    logger.error('Error calculating advice', { error: err })
    // Fallback if db fails
    return {
      action: input.level < 0.25 ? 'FILL' : 'WAIT',
      reasons: [],
      details: {
        todayPrice: null,
        mean15d: null,
        stddev15d: null,
        deltaVsMean15d: null,
        trend3d: null,
        sampleSize: 0
      }
    }
  }
}
