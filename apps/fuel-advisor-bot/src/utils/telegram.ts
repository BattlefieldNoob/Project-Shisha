import TelegramBot from 'node-telegram-bot-api'
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

/**
 * Inline keyboard for fuel type selection
 */
export function getFuelTypeKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '⛽ GASOLINE (Benzina)', callback_data: 'FUEL_GASOLINE' },
                { text: '🚛 DIESEL (Gasolio)', callback_data: 'FUEL_DIESEL' }
            ]
        ]
    }
}

/**
 * Inline keyboard for notification time selection
 */
export function getNotificationTimeKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🌅 07:00', callback_data: 'NOTIFY_07:00' },
                { text: '🌅 08:00', callback_data: 'NOTIFY_08:00' }
            ],
            [
                { text: '☀️ 09:00', callback_data: 'NOTIFY_09:00' },
                { text: '☀️ 10:00', callback_data: 'NOTIFY_10:00' }
            ],
            [
                { text: '🌆 18:00', callback_data: 'NOTIFY_18:00' },
                { text: '🌆 19:00', callback_data: 'NOTIFY_19:00' }
            ],
            [
                { text: '🌙 20:00', callback_data: 'NOTIFY_20:00' },
                { text: '🌙 21:00', callback_data: 'NOTIFY_21:00' }
            ],
            [
                { text: '🔕 Disable Notifications', callback_data: 'NOTIFY_off' }
            ]
        ]
    }
}

/**
 * Inline keyboard for removing favorite stations
 * @param stations - Array of { mimit_id, name, brand } objects
 */
export function getRemoveStationKeyboard(stations: { mimit_id: string, name: string, brand?: string }[]) {
    const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = []

    stations.forEach((station) => {
        const displayName = station.brand && station.brand.toLowerCase() !== 'pompe bianche'
            ? `${station.brand} - ${station.name}`
            : station.name

        inlineKeyboard.push([
            { text: `❌ Remove: ${displayName}`, callback_data: `REMOVE_STATION_${station.mimit_id}` }
        ])
    })

    // Add cancel button
    inlineKeyboard.push([
        { text: '↩️ Cancel', callback_data: 'REMOVE_CANCEL' }
    ])

    return { inline_keyboard: inlineKeyboard }
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

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export function formatStationDetails(station: { name: string, brand?: string, address?: string, city?: string }): string {
    const brandStr = station.brand && station.brand.toLowerCase() !== 'pompe bianche' ? `${station.brand} - ` : ''
    const locationStr = [station.address, station.city].filter(Boolean).join(', ')
    return `${brandStr}${station.name}${locationStr ? ` (${locationStr})` : ''}`
}
