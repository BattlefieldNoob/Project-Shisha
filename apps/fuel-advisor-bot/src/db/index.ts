import { Database } from 'bun:sqlite'
import path from 'path'
import fs from 'fs'
import { config } from '../config/env'
import { logger } from '../config/logging'

let db: Database | null = null

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const dbPath = path.resolve(process.cwd(), config.DB_PATH)
      const dbDir = path.dirname(dbPath)
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
      db = new Database(dbPath)
      runMigrations()
      resolve()
    } catch (err) {
      logger.error('Failed to initialize database', { error: err })
      reject(err)
    }
  })
}

function runMigrations() {
  const migrationsDir = path.resolve(process.cwd(), 'src/db/migrations')

  // Create versions table if not exists
  db?.run('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY)')

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const versionRow = db?.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(file)
    if (!versionRow) {
      logger.info(`Running migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      db?.run(sql)
      db?.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file)
    }
  }
  logger.info('Database migrations applied')
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

function prefixKeys(obj: Record<string, any>): Record<string, any> {
  return Object.keys(obj).reduce((acc, key) => {
    acc[`$${key}`] = obj[key]
    return acc
  }, {} as Record<string, any>)
}

// Basic CRUD examples (expand as needed)
export function upsertStation(data: {
  mimit_id: string
  name?: string
  brand?: string
  address?: string
  city?: string
  province?: string
  latitude?: number
  longitude?: number
}) {
  const now = new Date().toISOString()
  const stmt = getDb().prepare(
    `INSERT INTO stations (mimit_id, name, brand, address, city, province, latitude, longitude, created_at, updated_at)
     VALUES ($mimit_id, $name, $brand, $address, $city, $province, $latitude, $longitude, $created_at, $updated_at)
     ON CONFLICT(mimit_id) DO UPDATE SET name=$name, brand=$brand, address=$address, city=$city, province=$province, latitude=$latitude, longitude=$longitude, updated_at=$updated_at`,
  )
  stmt.run(prefixKeys({ ...data, created_at: now, updated_at: now }))
}

export function insertPrice(stationId: number, priceData: {
  date: string
  fuel_type: string
  price_eur_per_liter: number
}) {
  const now = new Date().toISOString()
  const stmt = getDb().prepare(
    `INSERT INTO prices (station_id, date, fuel_type, price_eur_per_liter, created_at)
     VALUES ($station_id, $date, $fuel_type, $price_eur_per_liter, $created_at)
     ON CONFLICT(station_id, date, fuel_type) DO UPDATE SET price_eur_per_liter=$price_eur_per_liter, created_at=$created_at`,
  )
  stmt.run(prefixKeys({ station_id: stationId, ...priceData, created_at: now }))
}

export function getStationByMimitId(mimitId: string) {
  const stmt = getDb().prepare('SELECT * FROM stations WHERE mimit_id = ?')
  return stmt.get(mimitId)
}

export function getStationById(id: number) {
  const stmt = getDb().prepare('SELECT * FROM stations WHERE id = ?')
  return stmt.get(id) as any
}

export function getAllStations() {
  const stmt = getDb().prepare('SELECT * FROM stations')
  return stmt.all() as any[]
}

export function getUserByChatId(chatId: string) {
  const stmt = getDb().prepare('SELECT * FROM users WHERE telegram_chat_id = ?')
  return stmt.get(chatId) as { id: number, telegram_chat_id: string } | undefined
}

export function upsertUser(chatId: string) {
  const now = new Date().toISOString()
  const stmt = getDb().prepare(
    `INSERT INTO users (telegram_chat_id, created_at, updated_at)
     VALUES ($chat_id, $created_at, $updated_at)
     ON CONFLICT(telegram_chat_id) DO UPDATE SET updated_at=$updated_at`,
  )
  stmt.run(prefixKeys({ chat_id: chatId, created_at: now, updated_at: now }))
}

export function getLast15DaysPrices(stationId: number, fuelType: string): { date: string, price_eur_per_liter: number }[] {
  const stmt = getDb().prepare(`
    SELECT date, price_eur_per_liter
    FROM prices
    WHERE station_id = $station_id AND fuel_type = $fuel_type
    ORDER BY date DESC
    LIMIT 15
  `)
  return stmt.all(prefixKeys({ station_id: stationId, fuel_type: fuelType })) as { date: string, price_eur_per_liter: number }[]
}

export function getUserPreferences(userId: number) {
  const stmt = getDb().prepare('SELECT * FROM user_preferences WHERE user_id = ?')
  const prefs = stmt.get(userId) as any
  if (prefs && typeof prefs.favorite_stations === 'string') {
    try {
      prefs.favorite_stations = JSON.parse(prefs.favorite_stations)
    } catch {
      prefs.favorite_stations = []
    }
  } else if (prefs) {
    prefs.favorite_stations = []
  }
  return prefs
}

export function upsertUserPreferences(userId: number, prefs: {
  main_station_id?: number | null,
  favorite_stations?: number[],
  fuel_type?: string | null,
  tank_size_liters?: number | null,
  notification_enabled?: number,
  notification_hour?: number | null,
  notification_minute?: number | null
}) {
  const now = new Date().toISOString()

  // Check if exists
  const existing = getUserPreferences(userId)

  if (existing) {
    const updatedPrefs = { ...existing, ...prefs, updated_at: now }
    // Omit id for update
    const { id: _id, ...toUpdate } = updatedPrefs

    if (toUpdate.favorite_stations && Array.isArray(toUpdate.favorite_stations)) {
      toUpdate.favorite_stations = JSON.stringify(toUpdate.favorite_stations)
    }

    // Dynamically build SET clause
    const keys = Object.keys(toUpdate)
    const setClause = keys.map(k => `${k}=$${k}`).join(', ')

    const stmt = getDb().prepare(`UPDATE user_preferences SET ${setClause} WHERE user_id=$user_id`)
    stmt.run(prefixKeys({ ...toUpdate }))
  } else {
    // Insert with defaults
    const stmt = getDb().prepare(`
      INSERT INTO user_preferences (user_id, main_station_id, favorite_stations, fuel_type, tank_size_liters, notification_enabled, notification_hour, notification_minute, created_at, updated_at)
      VALUES ($user_id, $main_station_id, $favorite_stations, $fuel_type, $tank_size_liters, $notification_enabled, $notification_hour, $notification_minute, $created_at, $updated_at)
    `)
    stmt.run(prefixKeys({
      user_id: userId,
      main_station_id: prefs.main_station_id ?? null,
      favorite_stations: prefs.favorite_stations ? JSON.stringify(prefs.favorite_stations) : '[]',
      fuel_type: prefs.fuel_type ?? null,
      tank_size_liters: prefs.tank_size_liters ?? null,
      notification_enabled: prefs.notification_enabled ?? 1,
      notification_hour: prefs.notification_hour ?? 8,
      notification_minute: prefs.notification_minute ?? 0,
      created_at: now,
      updated_at: now
    }))
  }
}

export function addFavoriteStation(userId: number, stationId: number) {
  const prefs = getUserPreferences(userId)
  if (!prefs) return

  const stations: number[] = prefs.favorite_stations || []
  if (!stations.includes(stationId)) {
    stations.push(stationId)
    upsertUserPreferences(userId, { favorite_stations: stations })
  }
}

export function removeFavoriteStation(userId: number, stationId: number) {
  const prefs = getUserPreferences(userId)
  if (!prefs) return

  let stations: number[] = prefs.favorite_stations || []
  if (stations.includes(stationId)) {
    stations = stations.filter(id => id !== stationId)
    upsertUserPreferences(userId, { favorite_stations: stations })
  }
}

export function getAllUsersWithNotification() {
  const stmt = getDb().prepare(`
    SELECT u.telegram_chat_id, p.*
    FROM users u
    JOIN user_preferences p ON u.id = p.user_id
    WHERE p.notification_enabled = 1
  `)
  const users = stmt.all() as any[]
  return users.map(u => {
    if (typeof u.favorite_stations === 'string') {
      try {
        u.favorite_stations = JSON.parse(u.favorite_stations)
      } catch {
        u.favorite_stations = []
      }
    } else {
      u.favorite_stations = []
    }
    return u
  })
}

