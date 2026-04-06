import { describe, it, expect, vi } from 'bun:test'
import {
  parseStationsCsv,
  parsePricesCsv,
  parseStationsCsvSimple,
  parsePricesCsvSimple,
  type ParseStats
} from './parsers'

// Mock config - must be done before importing parsers
vi.mock('../config/env', () => ({
  config: {
    FILTER_PROVINCE: '',
    FILTER_CITY: '',
  },
}))

// Mock logger
vi.mock('../config/logging', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Valid MIMIT Stations CSV format (pipe-delimited)
// Note: Column "Nome Impianto" is the actual name field
const VALID_STATIONS_CSV = `Estrazione del 01/01/2024
idImpianto|Gestore|BandieraTipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore1|ENI|Gas Station Roma|Via Roma 1|Roma|RM|41.9028|12.4964
67890|Gestore2|SHELL|Gas Station Milano|Via Milano 1|Milano|MI|45.4642|9.1900`

// Valid MIMIT Prices CSV format (pipe-delimited)
const VALID_PRICES_CSV = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|1.859|1|05/03/2026 21:30:06
12345|GASOLIO AUTO|1.659|1|05/03/2026 21:30:06`

describe('parseStationsCsv', () => {
  it('should parse valid stations CSV', () => {
    const { stations, stats } = parseStationsCsv(VALID_STATIONS_CSV)

    expect(stations.length).toBe(2)
    expect(stats.totalRecords).toBe(2)
    expect(stats.validRecords).toBe(2)
    expect(stats.skippedRecords).toBe(0)
    expect(stats.errors).toHaveLength(0)

    // Check first station
    expect(stations[0].mimit_id).toBe('12345')
    expect(stations[0].name).toBe('Gas Station Roma')
    expect(stations[0].province).toBe('RM')
    expect(stations[0].latitude).toBeCloseTo(41.9028)
    expect(stations[0].longitude).toBeCloseTo(12.4964)
  })

  it('should return empty result for empty content', () => {
    const { stations, stats } = parseStationsCsv('')

    expect(stations).toHaveLength(0)
    expect(stats.errors.length).toBeGreaterThan(0)
    expect(stats.errors[0]).toContain('empty')
  })

  it('should return empty result for single line content', () => {
    const { stations, stats } = parseStationsCsv('only|one|line')

    expect(stations).toHaveLength(0)
    expect(stats.errors.length).toBeGreaterThan(0)
  })

  it('should skip records with invalid coordinates', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|Gestore|BandieraTipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore1|ENI|Valid Station|Via Roma 1|Roma|RM|41.9028|12.4964
99999|Gestore2|BAD|Bad Station|Via Nowhere|Milano|MI|999.0|999.0`

    const { stations, stats } = parseStationsCsv(csv)

    expect(stations.length).toBe(1)
    expect(stations[0].mimit_id).toBe('12345')
    expect(stats.skippedRecords).toBe(1)
    expect(stats.warnings.length).toBeGreaterThan(0)
  })

  it('should filter by province when configured', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|Gestore|BandieraTipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
12345|Gestore1|ENI|Station One|Via Roma 1|Roma|RM|41.9028|12.4964
67890|Gestore2|SHELL|Station Two|Via Milano 1|Milano|MI|45.4642|9.19`

    const { stations } = parseStationsCsv(csv)

    // Without province filter, both should be included
    expect(stations.length).toBe(2)
    expect(stations.some(s => s.province === 'RM')).toBe(true)
    expect(stations.some(s => s.province === 'MI')).toBe(true)
  })
})

describe('parsePricesCsv', () => {
  it('should parse valid prices CSV', () => {
    const validIds = new Set(['12345'])
    const { prices, stats } = parsePricesCsv(VALID_PRICES_CSV, validIds)

    expect(prices.length).toBe(2)
    expect(stats.totalRecords).toBe(2)
    expect(stats.validRecords).toBe(2)
    expect(stats.skippedRecords).toBe(0)
    expect(stats.errors).toHaveLength(0)
  })

  it('should filter non-self-service prices', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|1.859|0|05/03/2026 21:30:06
12345|BENZINA|1.859|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345'])
    const { prices, stats } = parsePricesCsv(csv, validIds)

    expect(prices.length).toBe(1)
    expect(stats.skippedRecords).toBe(1)
  })

  it('should skip records not in validMimitIds', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|1.859|1|05/03/2026 21:30:06
99999|BENZINA|1.859|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345'])
    const { prices } = parsePricesCsv(csv, validIds)

    expect(prices.length).toBe(1)
    expect(prices[0].mimit_id).toBe('12345')
  })

  it('should skip invalid prices (out of range)', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|0.05|1|05/03/2026 21:30:06
12345|BENZINA|15.00|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345'])
    const { prices, stats } = parsePricesCsv(csv, validIds)

    expect(prices.length).toBe(0)
    expect(stats.skippedRecords).toBe(2)
  })

  it('should return empty result for invalid CSV', () => {
    const { prices, stats } = parsePricesCsv('not|valid', new Set())

    expect(prices).toHaveLength(0)
    expect(stats.errors.length).toBeGreaterThan(0)
  })

  it('should return empty result for empty content', () => {
    const { prices, stats } = parsePricesCsv('', new Set())

    expect(prices).toHaveLength(0)
    expect(stats.errors.length).toBeGreaterThan(0)
  })

  it('should map Italian fuel types correctly', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|1.859|1|05/03/2026 21:30:06
12346|GASOLIO AUTO|1.659|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345', '12346'])
    const { prices } = parsePricesCsv(csv, validIds)

    const gasoline = prices.find(p => p.mimit_id === '12345')
    const diesel = prices.find(p => p.mimit_id === '12346')

    expect(gasoline?.fuel_type).toBe('GASOLINE')
    expect(diesel?.fuel_type).toBe('DIESEL')
  })

  it('should parse date correctly', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|1.859|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345'])
    const { prices } = parsePricesCsv(csv, validIds)

    expect(prices[0].date).toBe('2026-03-05')
  })
})

describe('ParseStats', () => {
  it('should track total, valid, and skipped records', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|1.859|0|05/03/2026 21:30:06
12345|BENZINA|1.859|1|05/03/2026 21:30:06
67890|GASOLIO|1.659|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345', '67890'])
    const { stats } = parsePricesCsv(csv, validIds)

    expect(stats.totalRecords).toBe(3)
    expect(stats.validRecords).toBe(2)
    expect(stats.skippedRecords).toBe(1)
  })

  it('should collect warnings', () => {
    const csv = `Estrazione del 01/01/2024
idImpianto|descCarburante|prezzo|isSelf|dtComu
12345|BENZINA|invalid|1|05/03/2026 21:30:06`

    const validIds = new Set(['12345'])
    const { stats } = parsePricesCsv(csv, validIds)

    expect(stats.warnings.length).toBeGreaterThan(0)
  })
})

describe('Simple API backwards compatibility', () => {
  it('parseStationsCsvSimple should return just stations array', () => {
    const stations = parseStationsCsvSimple(VALID_STATIONS_CSV)
    expect(Array.isArray(stations)).toBe(true)
    expect(stations.length).toBe(2)
  })

  it('parsePricesCsvSimple should return just prices array', () => {
    const validIds = new Set(['12345'])
    const prices = parsePricesCsvSimple(VALID_PRICES_CSV, validIds)
    expect(Array.isArray(prices)).toBe(true)
    expect(prices.length).toBe(2)
  })
})
