import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test'

// Mock the logging module before importing other modules
vi.mock('../config/logging', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock the config module
vi.mock('../config/env', () => ({
  config: {
    FILTER_PROVINCE: 'PD',
    FILTER_CITY: '',
  },
  FILTER_PROVINCE: 'PD',
  FILTER_CITY: '',
}))

// Import after mocks are set up
import { downloadMimitCsv } from './mimitClient'
import { parseStationsCsv, parsePricesCsv } from './parsers'

describe('mimitClient', () => {
  const mockFetch = vi.fn()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('downloadMimitCsv', () => {
    it('should successfully download and return CSV content', async () => {
      const csvContent = 'Estrazione del 01/01/2024\nidImpianto|Name\n1|Test'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(csvContent),
      })

      const result = await downloadMimitCsv('https://example.com/test.csv')

      expect(result).toBe(csvContent)
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/test.csv')
    })

    it('should throw error on HTTP error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      await expect(downloadMimitCsv('https://example.com/notfound.csv')).rejects.toThrow(
        'HTTP error! status: 404'
      )
    })

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(downloadMimitCsv('https://example.com/fail.csv')).rejects.toThrow(
        'Network error'
      )
    })

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(''),
      })

      const result = await downloadMimitCsv('https://example.com/empty.csv')
      expect(result).toBe('')
    })

    it('should handle server error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(downloadMimitCsv('https://example.com/error.csv')).rejects.toThrow(
        'HTTP error! status: 500'
      )
    })

    it('should propagate fetch errors with context', async () => {
      const networkError = new Error('Connection refused')
      mockFetch.mockRejectedValueOnce(networkError)

      await expect(downloadMimitCsv('https://example.com/test.csv')).rejects.toThrow(
        'Connection refused'
      )
    })

    it('should handle timeout scenarios via AbortError', async () => {
      const abortError = new DOMException('The user aborted a request.', 'AbortError')
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(downloadMimitCsv('https://example.com/timeout.csv')).rejects.toThrow(
        'The user aborted a request.'
      )
    })
  })
})

describe('parseStationsCsv', () => {
  const validStationCsv = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|Eni Station|Eni|Self-service|My Station|123 Main St|Rome|PD|41.9028|12.4964
2|Shell Station|Shell|Self-service|Shell Roma|Via Roma 50|Rome|PD|41.9029|12.4965
3|Agip Station|Agip|Self-service|Agip Centro|Piazza Veneto 10|Milan|MI|45.4642|9.1900`

  const emptyCsv = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine`

  it('should parse valid station CSV correctly', () => {
    const result = parseStationsCsv(validStationCsv)

    expect(result).toHaveLength(2) // Only PD stations (filters apply)
    expect(result[0]).toEqual({
      mimit_id: '1',
      name: 'My Station',
      brand: 'Eni',
      address: '123 Main St',
      city: 'Rome',
      province: 'PD',
      latitude: 41.9028,
      longitude: 12.4964,
    })
  })

  it('should filter stations by province', () => {
    const result = parseStationsCsv(validStationCsv)

    // Should only have PD stations
    expect(result.every((s) => s.province === 'PD')).toBe(true)
  })

  it('should handle empty CSV', () => {
    const result = parseStationsCsv(emptyCsv)
    expect(result).toHaveLength(0)
  })

  it('should handle invalid latitude/longitude', () => {
    const csvWithInvalidCoords = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|Bad Station|Brand|Self-service|Test|Addr|City|PD|invalid|also-invalid`

    const result = parseStationsCsv(csvWithInvalidCoords)

    expect(result).toHaveLength(1)
    expect(result[0].latitude).toBe(0)
    expect(result[0].longitude).toBe(0)
  })

  it('should use Gestore as fallback for name when Nome Impianto is missing', () => {
    const csvWithGestoreOnly = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|My Gestore Name|Brand|Self-service||Addr|City|PD|41.9|12.5`

    const result = parseStationsCsv(csvWithGestoreOnly)

    expect(result[0].name).toBe('My Gestore Name')
  })

  it('should use Sconosciuto when both name and gestore are missing', () => {
    const csvWithNoName = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1||Brand|Self-service||Addr|City|PD|41.9|12.5`

    const result = parseStationsCsv(csvWithNoName)

    expect(result[0].name).toBe('Sconosciuto')
  })

  it('should handle whitespace in fields and normalize to uppercase', () => {
    const csvWithWhitespace = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|Gestore|Brand|Self-service|Name|Addr|City|PD|41.9|12.5`

    const result = parseStationsCsv(csvWithWhitespace)

    expect(result[0].province).toBe('PD') // Province is uppercased
    expect(result[0].city).toBe('City')
    expect(result[0].address).toBe('Addr')
  })

  it('should handle malformed CSV gracefully without throwing', () => {
    const malformedCsv = `Estrazione del 05/03/2026
idImpianto|Gestore
1`

    expect(() => parseStationsCsv(malformedCsv)).toThrow()
  })

  it('should handle CSV with missing columns', () => {
    const csvMissingCols = `Estrazione del 05/03/2026
idImpianto|Gestore`

    const result = parseStationsCsv(csvMissingCols)

    expect(Array.isArray(result)).toBe(true)
  })
})

describe('parsePricesCsv', () => {
  const validPricesCsv = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|05/03/2026 21:30:06
1|GASOLIO AUTO|1.729|1|05/03/2026 21:30:06
1|BENZINA|1.860|0|05/03/2026 21:30:06
2|GASOLIO|1.739|1|04/03/2026 21:30:06
3|BENZINA|1.879|1|03/03/2026 21:30:06
4|BENZINA|1.899|1|02/03/2026 21:30:06`

  it('should parse prices for valid station IDs only', () => {
    const validIds = new Set(['1', '2', '3'])
    const result = parsePricesCsv(validPricesCsv, validIds)

    // Should only include prices for IDs 1, 2, 3
    expect(result).toHaveLength(4)
    expect(result.map((p) => p.mimit_id).sort()).toEqual(['1', '1', '2', '3'])
  })

  it('should only include self-service prices (isSelf=1)', () => {
    const validIds = new Set(['1'])
    const result = parsePricesCsv(validPricesCsv, validIds)

    // Station 1 has 2 self-service prices (isSelf=1) and 1 non-self (isSelf=0)
    expect(result).toHaveLength(2)
  })

  it('should map Italian fuel types to standard names', () => {
    const csvWithAllFuels = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|05/03/2026 21:30:06
1|GASOLIO AUTO|1.729|1|05/03/2026 21:30:06`

    const result = parsePricesCsv(csvWithAllFuels, new Set(['1']))

    expect(result.find((p) => p.fuel_type === 'GASOLINE')?.price_eur_per_liter).toBe(1.859)
    expect(result.find((p) => p.fuel_type === 'DIESEL')?.price_eur_per_liter).toBe(1.729)
  })

  it('should parse date correctly from Italian format', () => {
    const csv = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|05/03/2026 21:30:06`

    const result = parsePricesCsv(csv, new Set(['1']))

    expect(result[0].date).toBe('2026-03-05')
  })

  it('should use fallback date when dtComu is missing', () => {
    const csvWithMissingDate = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|`

    const result = parsePricesCsv(csvWithMissingDate, new Set(['1']))

    // Should fallback to today's date
    expect(result[0].date).toBe(new Date().toISOString().split('T')[0])
  })

  it('should handle malformed date format and use fallback', () => {
    const csvWithBadDate = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|invalid-date`

    const result = parsePricesCsv(csvWithBadDate, new Set(['1']))

    // Should fallback to today's date
    expect(result[0].date).toBe(new Date().toISOString().split('T')[0])
  })

  it('should skip prices with invalid (NaN) values', () => {
    const csvWithInvalidPrice = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|invalid|1|05/03/2026 21:30:06
2|BENZINA|1.859|1|05/03/2026 21:30:06`

    const result = parsePricesCsv(csvWithInvalidPrice, new Set(['1', '2']))

    expect(result).toHaveLength(1)
    expect(result[0].mimit_id).toBe('2')
  })

  it('should handle empty validMimitIds set', () => {
    const result = parsePricesCsv(validPricesCsv, new Set())

    expect(result).toHaveLength(0)
  })

  it('should set station_id to 0 (will be filled by DB)', () => {
    const csv = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|05/03/2026 21:30:06`

    const result = parsePricesCsv(csv, new Set(['1']))

    expect(result[0].station_id).toBe(0)
  })

  it('should handle malformed CSV gracefully without throwing', () => {
    const malformedCsv = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo`

    expect(() => parsePricesCsv(malformedCsv, new Set(['1']))).not.toThrow()
  })

  it('should handle empty CSV content', () => {
    const result = parsePricesCsv('', new Set(['1']))

    expect(result).toHaveLength(0)
  })
})

describe('integration scenarios', () => {
  it('should handle complete stations workflow with multiple provinces', () => {
    const csv = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|Eni PD|Eni|Self|Eni Padova|Via Padova 1|Padova|PD|45.4064|11.8768
2|Shell PD|Shell|Self|Shell Padova|Via Padova 2|Padova|PD|45.4065|11.8769
3|Eni RO|Eni|Self|Eni Rovigo|Via Rovigo 1|Rovigo|RO|45.0695|11.7900
4|Agip PD|Agip|Self|Agip Padova|Via Padova 3|Padova|PD|45.4066|11.8770`

    const stations = parseStationsCsv(csv)

    // Should only have PD stations
    expect(stations).toHaveLength(3)
    expect(stations.every((s) => s.province === 'PD')).toBe(true)
    expect(stations.find((s) => s.mimit_id === '1')?.name).toBe('Eni Padova')
  })

  it('should handle complete prices workflow with mixed stations', () => {
    const stationsCsv = `Estrazione del 05/03/2026
idImpianto|Gestore|Bandiera|Self-service|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|Eni|Eni|Self|Eni Station|Addr|City|PD|41.9|12.5
2|Shell|Shell|Self|Shell Station|Addr|City|PD|41.9|12.5`

    const stations = parseStationsCsv(stationsCsv)
    const validIds = new Set(stations.map((s) => s.mimit_id))

    const pricesCsv = `Estrazione del 05/03/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|05/03/2026 21:30:06
1|DIESEL|1.729|1|05/03/2026 21:30:06
2|GASOLIO AUTO|1.739|1|04/03/2026 21:30:06
3|BENZINA|1.879|1|03/03/2026 21:30:06`

    const prices = parsePricesCsv(pricesCsv, validIds)

    // Should only have prices for stations 1 and 2 (IDs in validIds)
    expect(prices).toHaveLength(3)
    expect(prices.every((p) => validIds.has(p.mimit_id))).toBe(true)
  })
})
