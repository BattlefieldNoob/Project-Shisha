-- Initial migration
-- tables: stations, prices, users, user_preferences
-- SQLite

-- stations
CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mimit_id TEXT NOT NULL UNIQUE,
  name TEXT,
  brand TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stations_mimit_id ON stations(mimit_id);
CREATE INDEX IF NOT EXISTS idx_stations_city_province ON stations(city, province);

-- prices
CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  price_eur_per_liter REAL NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (station_id, date, fuel_type),
  FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prices_station_date ON prices(station_id, date);
CREATE INDEX IF NOT EXISTS idx_prices_station_fuel_date ON prices(station_id, fuel_type, date);

-- users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_chat_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_chat_id ON users(telegram_chat_id);

-- user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  main_station_id INTEGER,
  fuel_type TEXT,
  tank_size_liters REAL,
  notification_enabled INTEGER NOT NULL DEFAULT 1,
  notification_hour INTEGER,
  notification_minute INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (main_station_id) REFERENCES stations(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
