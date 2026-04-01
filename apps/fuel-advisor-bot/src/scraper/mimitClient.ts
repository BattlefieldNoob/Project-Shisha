import { logger } from '../config/logging'

export async function downloadMimitCsv(url: string): Promise<string> {
    logger.info(`Downloading MIMIT CSV from ${url}...`)
    try {
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const text = await response.text()
        logger.info(`Downloaded ${text.length} bytes from ${url}`)
        return text
    } catch (error) {
        logger.error('Error downloading MIMIT CSV', { url, error })
        throw error
    }
}
