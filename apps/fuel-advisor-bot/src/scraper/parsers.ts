import { parse } from 'csv-parse/sync'
import { config } from '../config/env'
import { logger } from '../config/logging'

export interface StationData {
    mimit_id: string
    name: string
    brand: string
    address: string
    city: string
    province: string
    latitude: number
    longitude: number
}

export interface PriceData {
    station_id: number // We will map mimit_id to internal DB id later, so here let's just use mimit_id as string temporarily
    mimit_id: string
    date: string
    fuel_type: string
    price_eur_per_liter: number
}

interface StationRecord {
    Provincia: string
    Comune: string
    Latitudine: string
    Longitudine: string
    idImpianto: string
    'Nome Impianto'?: string
    Gestore?: string
    Bandiera: string
    Indirizzo: string
}

interface PriceRecord {
    idImpianto: string
    descCarburante: string
    prezzo: string
    isSelf: string
    dtComu?: string
    dtComunica?: string
}

export function parseStationsCsv(csvContent: string): StationData[] {
    // MIMIT stations CSV format:
    // Line 1: Estrazione del <date>
    // Line 2: idImpianto|Gestore|Bandiera|Tipo Impianto|Nome Impianto|Indirizzo|Comune|Provincia|Latitudine|Longitudine
    const records = parse(csvContent, {
        delimiter: '|',
        columns: true,
        skip_empty_lines: true,
        from_line: 2, // skip the "Estrazione del" line
        relax_quotes: true,
        quote: false
    }) as StationRecord[]

    const stations: StationData[] = []

    for (const record of records) {
        const province = (record.Provincia || '').trim().toUpperCase()
        const city = (record.Comune || '').trim().toUpperCase()

        // Apply filters
        if (config.FILTER_PROVINCE && province !== config.FILTER_PROVINCE.toUpperCase()) {
            continue
        }
        if (config.FILTER_CITY && city !== config.FILTER_CITY.toUpperCase()) {
            continue
        }

        const lat = parseFloat(record.Latitudine)
        const lon = parseFloat(record.Longitudine)

        stations.push({
            mimit_id: record.idImpianto,
            name: record['Nome Impianto'] || record.Gestore || 'Sconosciuto',
            brand: record.Bandiera || '',
            address: record.Indirizzo || '',
            city: record.Comune || '',
            province: record.Provincia || '',
            latitude: isNaN(lat) ? 0 : lat,
            longitude: isNaN(lon) ? 0 : lon
        })
    }

    logger.info(`Parsed ${stations.length} stations matching filters`)
    return stations
}

export function parsePricesCsv(csvContent: string, validMimitIds: Set<string>): PriceData[] {
    // MIMIT prices CSV format:
    // Line 1: Estrazione del <date>
    // Line 2: idImpianto|descCarburante|prezzo|isSelf|dtComu (note: dtComu might be truncated in header but values look like '05/03/2026 21:30:06')
    const records = parse(csvContent, {
        delimiter: '|',
        columns: true,
        skip_empty_lines: true,
        from_line: 2, // skip the "Estrazione del" line
        relax_quotes: true,
        quote: false
    }) as PriceRecord[]

    const prices: PriceData[] = []

    for (const record of records) {
        // Only process prices for stations we care about
        if (!validMimitIds.has(record.idImpianto)) {
            continue
        }

        // Filter only self-service prices (isSelf = 1)
        if (record.isSelf !== '1') {
            continue
        }

        const price = parseFloat(record.prezzo)
        if (isNaN(price)) {
            continue
        }

        // Format date from "DD/MM/YYYY HH:MM:SS" to "YYYY-MM-DD"
        // Handle both 'dtComu' and 'dtComunica' column names just in case
        const dtStr = record.dtComu || record.dtComunica || ''
        let dateStr = ''
        if (dtStr) {
            const parts = dtStr.split(' ')[0].split('/') // ["DD", "MM", "YYYY"]
            if (parts.length === 3) {
                dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
            }
        }

        // Fallback date: today (YYYY-MM-DD)
        if (!dateStr) {
            dateStr = new Date().toISOString().split('T')[0]
        }

        // Map Italian fuel names to standard ones
        const fuelSource = (record.descCarburante || '').trim().toUpperCase()
        let fuelType = fuelSource
        if (fuelSource === 'BENZINA') fuelType = 'GASOLINE'
        else if (fuelSource.includes('GASOLIO')) fuelType = 'DIESEL'

        prices.push({
            station_id: 0, // Will be filled when inserting using DB id
            mimit_id: record.idImpianto,
            date: dateStr,
            fuel_type: fuelType,
            price_eur_per_liter: price
        })
    }

    logger.info(`Parsed ${prices.length} self-service prices for known stations`)
    return prices
}
