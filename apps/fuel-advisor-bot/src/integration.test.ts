import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { getAdvice } from './advisor/advisor'
import { parseStationsCsv, parsePricesCsv } from './scraper/parsers'
import type { AdviceInput } from './advisor/types'

vi.mock('./config/logging', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('./config/env', () => ({
  config: { FILTER_PROVINCE: 'PD', FILTER_CITY: '', MIMIT_STATIONS_URL: 'https://example.com/stations.csv', MIMIT_PRICES_URL: 'https://example.com/prices.csv' },
}))

const mockGetLast15DaysPrices = vi.fn()
vi.mock('./db/index', () => ({
  upsertStation: vi.fn(),
  insertPrice: vi.fn(),
  getStationByMimitId: vi.fn(),
  getLast15DaysPrices: mockGetLast15DaysPrices,
}))

vi.mock('./scraper/mimitClient', () => ({
  downloadMimitCsv: vi.fn(),
}))

describe('Scraper to Advisor Integration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should complete full data flow from scraper to advisor', async () => {
    const stationsCsv = `Estrazione del 06/04/2026
idImpianto|Gestore|Bandiera|Self-service|Name|Indirizzo|Comune|Provincia|Latitudine|Longitudine
1|Eni Padova|Eni|Self|Eni Centro|Via Padova 1|Padova|PD|45.4064|11.8768
2|Shell Padova|Shell|Self|Shell Centro|Via Roma 10|Padova|PD|45.4065|11.8769`
    const { stations } = parseStationsCsv(stationsCsv)
    expect(stations).toHaveLength(2)
    const validMimitIds = new Set(stations.map(s => s.mimit_id))

    const pricesCsv = `Estrazione del 06/04/2026
idImpianto|descCarburante|prezzo|isSelf|dtComu
1|BENZINA|1.859|1|06/04/2026 09:00:00
1|GASOLIO AUTO|1.729|1|06/04/2026 09:00:00
1|BENZINA|1.855|1|05/04/2026 09:00:00
1|GASOLIO AUTO|1.719|1|05/04/2026 09:00:00
2|BENZINA|1.869|1|06/04/2026 09:00:00`
    const { prices } = parsePricesCsv(pricesCsv, validMimitIds)
    expect(prices.length).toBeGreaterThanOrEqual(4)

    const historicalPrices = [
      { date: '2026-04-06', price_eur_per_liter: 1.729 },
      { date: '2026-04-05', price_eur_per_liter: 1.719 },
      { date: '2026-04-04', price_eur_per_liter: 1.725 },
      { date: '2026-04-03', price_eur_per_liter: 1.730 },
      { date: '2026-04-02', price_eur_per_liter: 1.715 },
    ]
    mockGetLast15DaysPrices.mockReturnValue(historicalPrices)

    const input: AdviceInput = { stationId: 1, fuelType: 'DIESEL', level: 0.5 }
    const advice = await getAdvice(input)

    expect(advice.details.sampleSize).toBe(5)
    expect(advice.details.todayPrice).toBe(1.729)
    expect(['FILL', 'HALF', 'MINIMUM', 'WAIT']).toContain(advice.action)
  })

  it('should give FILL advice when price is below average with low tank', async () => {
    mockGetLast15DaysPrices.mockReturnValue([
      { date: '2026-04-06', price_eur_per_liter: 1.500 },
      { date: '2026-04-05', price_eur_per_liter: 1.700 },
      { date: '2026-04-04', price_eur_per_liter: 1.710 },
    ])
    const advice = await getAdvice({ stationId: 1, fuelType: 'GASOLINE', level: 0.3 })
    expect(advice.details.deltaVsMean15d).toBeLessThan(0)
    expect(advice.action).toBe('FILL')
  })

  it('should give WAIT advice when price is above average with adequate tank', async () => {
    mockGetLast15DaysPrices.mockReturnValue([
      { date: '2026-04-06', price_eur_per_liter: 1.850 },
      { date: '2026-04-05', price_eur_per_liter: 1.650 },
      { date: '2026-04-04', price_eur_per_liter: 1.640 },
    ])
    const advice = await getAdvice({ stationId: 1, fuelType: 'GASOLINE', level: 0.6 })
    expect(advice.details.deltaVsMean15d).toBeGreaterThan(0)
    expect(advice.action).toBe('WAIT')
  })

  it('should handle station with no historical prices', async () => {
    mockGetLast15DaysPrices.mockReturnValue([])
    const advice = await getAdvice({ stationId: 999, fuelType: 'DIESEL', level: 0.2 })
    expect(advice.action).toBe('FILL')
    expect(advice.details.sampleSize).toBe(0)
  })

  it('should respect full tank limit when action would be FILL', async () => {
    // With 1 day of data, level < 0.25 would suggest FILL but 0.95 should override
    mockGetLast15DaysPrices.mockReturnValue([
      { date: '2026-04-06', price_eur_per_liter: 1.500 },
    ])
    const advice = await getAdvice({ stationId: 1, fuelType: 'DIESEL', level: 0.95 })
    expect(advice.action).toBe('WAIT')
  })

  it('should handle mixed fuel types correctly', async () => {
    mockGetLast15DaysPrices.mockImplementation((_: number, ft: string) => {
      if (ft === 'GASOLINE') return [{ date: '2026-04-06', price_eur_per_liter: 1.859 }]
      return []
    })
    const gasAdvice = await getAdvice({ stationId: 1, fuelType: 'GASOLINE', level: 0.5 })
    const dieselAdvice = await getAdvice({ stationId: 1, fuelType: 'DIESEL', level: 0.5 })
    expect(gasAdvice.details.sampleSize).toBe(1)
    expect(dieselAdvice.details.sampleSize).toBe(0)
  })

  it('should return fallback advice on DB error', async () => {
    mockGetLast15DaysPrices.mockImplementation(() => { throw new Error('DB fail') })
    const advice = await getAdvice({ stationId: 1, fuelType: 'DIESEL', level: 0.15 })
    expect(advice.action).toBe('FILL')
  })
})