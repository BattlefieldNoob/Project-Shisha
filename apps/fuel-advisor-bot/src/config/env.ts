import dotenv from 'dotenv'
import path from 'path'

// Load .env file if present
const envPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: envPath })

// Typed getters for environment variables
export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN as string
export const DB_PATH = process.env.DB_PATH || 'data/fuel.db'
export const SCRAPER_RUN_HOUR = parseInt(process.env.SCRAPER_RUN_HOUR ?? '2', 10)
export const NOTIFY_TIME = process.env.NOTIFY_TIME ?? '08:00'
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
export const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true'
export const DATA_DIR = process.env.DATA_DIR || 'data'

export const MIMIT_STATIONS_URL = process.env.MIMIT_STATIONS_URL || 'https://www.mise.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv'
export const MIMIT_PRICES_URL = process.env.MIMIT_PRICES_URL || 'https://www.mise.gov.it/images/exportCSV/prezzo_alle_8.csv'
export const FILTER_PROVINCE = process.env.FILTER_PROVINCE || 'PD'
export const FILTER_CITY = process.env.FILTER_CITY || ''

// Helper to ensure required variables are present
export function ensureRequired(...vars: Array<string>): void {
  vars.forEach((name) => {
    if (!process.env[name]) {
      throw new Error(`Required environment variable ${name} is missing`)
    }
  })
}

// Export an object for easier destructuring
export const config = {
  TELEGRAM_TOKEN,
  DB_PATH,
  SCRAPER_RUN_HOUR,
  NOTIFY_TIME,
  LOG_LEVEL,
  LOG_TO_FILE,
  DATA_DIR,
  MIMIT_STATIONS_URL,
  MIMIT_PRICES_URL,
  FILTER_PROVINCE,
  FILTER_CITY,
}
