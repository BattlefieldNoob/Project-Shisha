import { logger } from '../config/logging'
import { config } from '../config/env'
import { getStationByMimitId, upsertStation, insertPrice } from '../db/index'
import { downloadMimitCsv } from './mimitClient'
import { parseStationsCsv, parsePricesCsv } from './parsers'

export async function runDailyScrape() {
  logger.info('Starting daily scrape...')
  try {
    // 1. Download and Process Stations
    const stationsCsv = await downloadMimitCsv(config.MIMIT_STATIONS_URL)
    const stations = parseStationsCsv(stationsCsv)

    for (const station of stations) {
      upsertStation(station)
    }
    logger.info(`Successfully saved ${stations.length} stations to database`)

    // 2. Build Set of valid MIMIT IDs for filtering
    const validMimitIds = new Set(stations.map(s => s.mimit_id))

    // 3. Download and Process Prices
    const pricesCsv = await downloadMimitCsv(config.MIMIT_PRICES_URL)
    const prices = parsePricesCsv(pricesCsv, validMimitIds)

    let insertedPrices = 0
    for (const price of prices) {
      const dbStation = getStationByMimitId(price.mimit_id) as { id: number } | undefined
      if (dbStation) {
        insertPrice(dbStation.id, {
          date: price.date,
          fuel_type: price.fuel_type,
          price_eur_per_liter: price.price_eur_per_liter
        })
        insertedPrices++
      }
    }
    logger.info(`Successfully saved ${insertedPrices} prices to database`)
    logger.info('Daily scrape completed successfully')
  } catch (err) {
    logger.error('Error during daily scrape', { error: err })
    throw err
  }
}
