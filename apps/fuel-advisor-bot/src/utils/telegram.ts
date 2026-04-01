import { AdviceOutput, AdviceAction } from '../advisor/types'

function formatAction(action: AdviceAction): string {
    switch (action) {
        case 'FILL': return '🟢 **FILL THE TANK** 🟢'
        case 'HALF': return '🟡 **FILL HALF TANK** 🟡'
        case 'MINIMUM': return '🟠 **ADD JUST THE MINIMUM** 🟠'
        case 'WAIT': return '🔴 **WAIT, DO NOT REFUEL** 🔴'
        default: return `**${action}**`
    }
}

export function formatAdviceMessage(stationName: string, advice: AdviceOutput, includeRecommendation: boolean = true): string {
    const { action, details, reasons } = advice

    let msg = `⛽ **${stationName}**\n`

    if (details.todayPrice !== null) {
        msg += `💶 Today's price: **${details.todayPrice.toFixed(3)} €/L**`
    } else {
        msg += `💶 Today's price: N/A`
    }

    if (details.deltaVsMean15d !== null) {
        const diff = details.deltaVsMean15d
        const sign = diff > 0 ? '+' : ''
        msg += ` (📉 ${sign}${diff.toFixed(3)} vs avg)\n`
    } else {
        msg += `\n`
    }

    if (includeRecommendation) {
        msg += `\n🎯 **RECOMMENDATION:** ${formatAction(action)}\n`

        if (reasons.length > 0) {
            msg += `_Why?_\n`
            for (const r of reasons) {
                // Formatting specific reasons to be more readable
                const cleanReason = r.replace(/_/g, ' ').toLowerCase()
                msg += `   • ${cleanReason}\n`
            }
        }
    }

    return msg + '\n'
}

export function getTankLevelKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: 'Almost empty (≤15%)', callback_data: 'LEVEL_0.15' },
                { text: 'About 1/4', callback_data: 'LEVEL_0.25' }
            ],
            [
                { text: 'About 1/2', callback_data: 'LEVEL_0.50' },
                { text: '3/4 or more', callback_data: 'LEVEL_0.75' }
            ]
        ]
    }
}

// Haversine formula to calculate distance in kilometers
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180)
}

export function formatStationDetails(station: { name: string, brand?: string, address?: string, city?: string }): string {
    const brandStr = station.brand && station.brand.toLowerCase() !== 'pompe bianche' ? `${station.brand} - ` : ''
    const locationStr = [station.address, station.city].filter(Boolean).join(', ')
    return `${brandStr}${station.name}${locationStr ? ` (${locationStr})` : ''}`
}
