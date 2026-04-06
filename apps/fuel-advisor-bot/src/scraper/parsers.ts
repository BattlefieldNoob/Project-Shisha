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
    station_id: number
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
    'Nom Impianto'?: string
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

// Validation constants
const MIN_LATITUDE = -90
const MAX_LATITUDE = 90
const MIN_LONGITUDE = -180
const MAX_LONGITUDE = 180
const MIN_PRICE = 0.1  // EUR 0.10 minimum reasonable fuel price
const MAX_PRICE = 10.0 // EUR 10.00 maximum reasonable fuel price

// Stats for parsing results
export interface ParseStats {
    totalRecords: number
    validRecords: number
    skippedRecords: number
    warnings: string[]
    errors: string[]
}

function createStats(): ParseStats {
    return {
        totalRecords: 0,
        validRecords: 0,
        skippedRecords: 0,
        warnings: [],
        errors: [],
    }
}

/**
 * Validate coordinate values
 */
function isValidCoordinate(lat: number, lon: number): boolean {
    return (
        !isNaN(lat) &&
        !isNaN(lon) &&
        lat >= MIN_LATITUDE &&
        lat <= MAX_LATITUDE &&
        lon >= MIN_LONGITUDE &&
        lon <= MAX_LONGITUDE
    )
}

/**
 * Validate price value
 */
function isValidPrice(price: number): boolean {
    return !isNaN(price) && price >= MIN_PRICE && price <= MAX_PRICE
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
    if (!dateStr || dateStr.length !== 10) return false
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateStr)) return false
    const date = new Date(dateStr)
    return !isNaN(date.getTime())
}

/**
 * Validate required string field
 */
function isValidString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0
}

/**
 * Check if content appears to be a valid CSV
 * Handles the MIMIT format which has an "Estrazione del..." line before the header
 */
function validateCsvHeader(csvContent: string, expectedDelimiter: string): { valid: boolean; error?: string } {
    if (!csvContent || csvContent.trim().length === 0) {
        return { valid: false, error: 'CSV content is empty' }
    }

    const lines = csvContent.split('\n').filter(l => l.trim().length > 0)
    if (lines.length < 2) {
        return { valid: false, error: `CSV has only ${lines.length} line(s), expected at least 2 (header + data)` }
    }

    // Find the actual header line (skip "Estrazione del..." line if present)
    let headerLine = lines[0]
    let headerIndex = 0

    // If first line starts with "Estrazione del", use second line as header
    if (headerLine.startsWith('Estrazione del') || !headerLine.includes(expectedDelimiter)) {
        if (lines.length < 2) {
            return { valid: false, error: 'CSV header not found after extraction date line' }
        }
        headerLine = lines[1]
        headerIndex = 1
    }

    // Check if header uses the expected delimiter
    if (!headerLine.includes(expectedDelimiter)) {
        return { valid: false, error: `Header does not contain delimiter '${expectedDelimiter}'` }
    }

    return { valid: true, error: undefined }
}

/**
 * Safely parse float with fallback
 */
function safeParseFloat(value: string | undefined, fallback: number = NaN): number {
    if (value === undefined || value === null || value.trim() === '') {
        return fallback
    }
    const parsed = parseFloat(value.trim())
    return isNaN(parsed) ? fallback : parsed
}

/**
 * Safely parse integer with fallback
 */
function safeParseInt(value: string | undefined, fallback: number = NaN): number {
    if (value === undefined || value === null || value.trim() === '') {
        return fallback
    }
    const parsed = parseInt(value.trim(), 10)
    return isNaN(parsed) ? fallback : parsed
}

export function parseStationsCsv(csvContent: string): { stations: StationData[]; stats: ParseStats } {
    const stats = createStats()
    const stations: StationData[] = []

    // Validate input
    const validation = validateCsvHeader(csvContent, '|')
    if (!validation.valid) {
        logger.error(`Invalid stations CSV: ${validation.error}`)
        stats.errors.push(validation.error!)
        return { stations, stats }
    }

    // Check for extraction date line (first line should be "Estrazione del ...")
    const firstLine = csvContent.split('\n')[0].trim()
    if (firstLine.startsWith('Estrazione del')) {
        stats.warnings.push('Detected extraction date header line, skipping...')
    }

    try {
        const records = parse(csvContent, {
            delimiter: '|',
            columns: true,
            skip_empty_lines: true,
            from_line: 2,
            relax_quotes: true,
            quote: false,
            on_record: (record) => {
                stats.totalRecords++
                return record
            },
        }) as StationRecord[]

        for (const record of records) {
            // Validate required fields
            if (!record.idImpianto || !isValidString(record.idImpianto)) {
                stats.skippedRecords++
                if (stats.warnings.length < 10) {
                    stats.warnings.push(`Skipping record with missing idImpianto`)
                }
                continue
            }

            const lat = safeParseFloat(record.Latitudine, NaN)
            const lon = safeParseFloat(record.Longitudine, NaN)

            // Validate coordinates
            if (!isValidCoordinate(lat, lon)) {
                stats.skippedRecords++
                if (stats.warnings.length < 10) {
                    stats.warnings.push(
                        `Invalid coordinates for station ${record.idImpianto}: lat=${record.Latitudine}, lon=${record.Longitudine}`
                    )
                }
                continue
            }

            // Apply filters
            const province = (record.Provincia || '').trim().toUpperCase()
            const city = (record.Comune || '').trim().toUpperCase()

            if (config.FILTER_PROVINCE && province !== config.FILTER_PROVINCE.toUpperCase()) {
                stats.skippedRecords++
                continue
            }
            if (config.FILTER_CITY && city !== config.FILTER_CITY.toUpperCase()) {
                stats.skippedRecords++
                continue
            }

            // Create station with safe field access
            const station: StationData = {
                mimit_id: record.idImpianto.trim(),
                name: record['Nom Impianto']?.trim() || record.Gestore?.trim() || 'Sconosciuto',
                brand: record.Bandiera?.trim() || '',
                address: record.Indirizzo?.trim() || '',
                city: record.Comune?.trim() || '',
                province: record.Provincia?.trim() || '',
                latitude: lat,
                longitude: lon,
            }

            stations.push(station)
            stats.validRecords++
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        logger.error(`Error parsing stations CSV: ${errorMsg}`)
        stats.errors.push(`Parse error: ${errorMsg}`)
    }

    logger.info(`Parsed ${stations.length} stations matching filters`, {
        total: stats.totalRecords,
        valid: stats.validRecords,
        skipped: stats.skippedRecords,
        warnings: stats.warnings.length,
    })

    if (stats.warnings.length > 0 && stats.warnings.length <= 5) {
        stats.warnings.forEach(w => logger.warn(w))
    }

    return { stations, stats }
}

export function parsePricesCsv(
    csvContent: string,
    validMimitIds: Set<string>
): { prices: PriceData[]; stats: ParseStats } {
    const stats = createStats()
    const prices: PriceData[] = []

    // Validate input
    const validation = validateCsvHeader(csvContent, '|')
    if (!validation.valid) {
        logger.error(`Invalid prices CSV: ${validation.error}`)
        stats.errors.push(validation.error!)
        return { prices, stats }
    }

    // Check for extraction date line
    const firstLine = csvContent.split('\n')[0].trim()
    if (firstLine.startsWith('Estrazione del')) {
        stats.warnings.push('Detected extraction date header line, skipping...')
    }

    try {
        const records = parse(csvContent, {
            delimiter: '|',
            columns: true,
            skip_empty_lines: true,
            from_line: 2,
            relax_quotes: true,
            quote: false,
            on_record: (record) => {
                stats.totalRecords++
                return record
            },
        }) as PriceRecord[]

        for (const record of records) {
            // Validate required fields
            if (!record.idImpianto || !isValidString(record.idImpianto)) {
                stats.skippedRecords++
                if (stats.warnings.length < 10) {
                    stats.warnings.push('Skipping record with missing station id')
                }
                continue
            }

            // Only process prices for stations we care about
            if (validMimitIds.size > 0 && !validMimitIds.has(record.idImpianto.trim())) {
                stats.skippedRecords++
                continue
            }

            // Filter only self-service prices (isSelf = 1)
            const isSelf = record.isSelf?.trim()
            if (isSelf !== '1') {
                stats.skippedRecords++
                continue
            }

            // Parse and validate price
            const price = safeParseFloat(record.prezzo, NaN)
            if (!isValidPrice(price)) {
                stats.skippedRecords++
                if (stats.warnings.length < 10) {
                    stats.warnings.push(
                        `Invalid price for station ${record.idImpianto}: ${record.prezzo}`
                    )
                }
                continue
            }

            // Parse date
            const dtStr = record.dtComu || record.dtComunica || ''
            let dateStr = ''
            if (dtStr && isValidString(dtStr)) {
                const parts = dtStr.split(' ')[0].split('/')
                if (parts.length === 3) {
                    const day = safeParseInt(parts[0], 0)
                    const month = safeParseInt(parts[1], 0)
                    const year = safeParseInt(parts[2], 0)
                    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
                        dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    }
                }
            }

            // Fallback to today's date
            if (!dateStr || !isValidDate(dateStr)) {
                dateStr = new Date().toISOString().split('T')[0]
                stats.warnings.push(`Using fallback date for station ${record.idImpianto}`)
            }

            // Map Italian fuel names to standard ones
            const fuelSource = (record.descCarburante || '').trim().toUpperCase()
            let fuelType = fuelSource
            if (fuelSource === 'BENZINA') fuelType = 'GASOLINE'
            else if (fuelSource.includes('GASOLIO')) fuelType = 'DIESEL'

            const priceData: PriceData = {
                station_id: 0,
                mimit_id: record.idImpianto.trim(),
                date: dateStr,
                fuel_type: fuelType,
                price_eur_per_liter: price,
            }

            prices.push(priceData)
            stats.validRecords++
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        logger.error(`Error parsing prices CSV: ${errorMsg}`)
        stats.errors.push(`Parse error: ${errorMsg}`)
    }

    logger.info(`Parsed ${prices.length} self-service prices for known stations`, {
        total: stats.totalRecords,
        valid: stats.validRecords,
        skipped: stats.skippedRecords,
        warnings: stats.warnings.length,
    })

    if (stats.warnings.length > 0 && stats.warnings.length <= 5) {
        stats.warnings.forEach(w => logger.warn(w))
    }

    return { prices, stats }
}

// Keep backwards compatible simple API
export function parseStationsCsvSimple(csvContent: string): StationData[] {
    return parseStationsCsv(csvContent).stations
}

export function parsePricesCsvSimple(csvContent: string, validMimitIds: Set<string>): PriceData[] {
    return parsePricesCsv(csvContent, validMimitIds).prices
}
