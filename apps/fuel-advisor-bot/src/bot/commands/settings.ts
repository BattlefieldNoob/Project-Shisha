import TelegramBot from 'node-telegram-bot-api'
import { getUserByChatId, getUserPreferences, upsertUserPreferences, getStationByMimitId, getStationById, addFavoriteStation, removeFavoriteStation } from '../../db/index'
import { formatStationDetails } from '../../utils/telegram'
import { logger } from '../../config/logging'

export function handleSettings(bot: TelegramBot, msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString()

    try {
        const user = getUserByChatId(chatId)
        if (!user) return bot.sendMessage(msg.chat.id, 'Please run /start first.')

        const prefs = getUserPreferences(user.id)
        if (!prefs) return bot.sendMessage(msg.chat.id, 'Preferences not found.')

        // Format stations list
        const stations: number[] = prefs.favorite_stations || []
        let stationsList = 'None set'

        if (stations.length > 0) {
            stationsList = ''
            for (const id of stations) {
                const station = getStationById(id)
                if (station) {
                    stationsList += `- ${formatStationDetails(station)} (ID: \`${station.mimit_id}\`)\n`
                }
            }
        }

        const fuelType = prefs.fuel_type || 'Not set'
        const notifyEnabled = prefs.notification_enabled ? 'Yes' : 'No'
        const notifyTime = `${String(prefs.notification_hour).padStart(2, '0')}:${String(prefs.notification_minute).padStart(2, '0')}`

        const msgText = `⚙️ **Your Settings**\n\n` +
            `⛽ **Favorite Stations:**\n${stationsList}\n` +
            `🏎️ **Fuel Type:** ${fuelType}\n` +
            `🔔 **Daily Notification:** ${notifyEnabled} (at ${notifyTime})\n\n` +
            `*To change these, send a message like:*\n` +
            `- \`/addstation 12345\` (replace 12345 with MIMIT ID. Search https://carburanti.mise.gov.it to find IDs)\n` +
            `- \`/removestation 12345\` (remove a station)\n` +
            `- \`/setfuel GASOLINE\` or \`/setfuel DIESEL\`\n` +
            `- \`/setnotify 08:30\` (to enable and set time)\n` +
            `- \`/setnotify off\` (to disable notifications)\n`

        bot.sendMessage(msg.chat.id, msgText, { parse_mode: 'Markdown' })
    } catch (error) {
        logger.error('Error in /settings', { error })
    }
}

export function handleAddStation(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id.toString()
    const mimitId = match ? match[1] : null

    if (!mimitId) return bot.sendMessage(msg.chat.id, 'Format: /addstation <MIMIT_ID>')

    try {
        const user = getUserByChatId(chatId)
        if (!user) return bot.sendMessage(msg.chat.id, 'Please run /start first.')

        const station = getStationByMimitId(mimitId) as { id: number, name: string } | undefined
        if (!station) {
            return bot.sendMessage(msg.chat.id, `Station with ID ${mimitId} not found in my database. Either it's incorrect or outside my configured area.`)
        }

        addFavoriteStation(user.id, station.id)
        bot.sendMessage(msg.chat.id, `✅ Added to favorites: **${station.name}**`, { parse_mode: 'Markdown' })
    } catch (error) {
        logger.error('Error in /addstation', { error })
    }
}

export function handleRemoveStation(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id.toString()
    const mimitId = match ? match[1] : null

    if (!mimitId) return bot.sendMessage(msg.chat.id, 'Format: /removestation <MIMIT_ID>')

    try {
        const user = getUserByChatId(chatId)
        if (!user) return bot.sendMessage(msg.chat.id, 'Please run /start first.')

        const station = getStationByMimitId(mimitId) as { id: number, name: string } | undefined
        if (!station) {
            return bot.sendMessage(msg.chat.id, `Station with ID ${mimitId} not found in database.`)
        }

        removeFavoriteStation(user.id, station.id)
        bot.sendMessage(msg.chat.id, `✅ Removed from favorites: **${station.name}**`, { parse_mode: 'Markdown' })
    } catch (error) {
        logger.error('Error in /removestation', { error })
    }
}

export function handleSetFuel(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id.toString()
    let fuelType = match ? match[1].toUpperCase() : ''

    if (fuelType !== 'GASOLINE' && fuelType !== 'DIESEL') {
        return bot.sendMessage(msg.chat.id, 'Format: /setfuel GASOLINE or /setfuel DIESEL')
    }

    try {
        const user = getUserByChatId(chatId)
        if (!user) return bot.sendMessage(msg.chat.id, 'Please run /start first.')

        upsertUserPreferences(user.id, { fuel_type: fuelType })
        bot.sendMessage(msg.chat.id, `✅ Fuel type set to: **${fuelType}**`, { parse_mode: 'Markdown' })
    } catch (error) {
        logger.error('Error in /setfuel', { error })
    }
}

export function handleSetNotify(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpExecArray | null) {
    const chatId = msg.chat.id.toString()
    const val = match ? match[1].toLowerCase() : ''

    try {
        const user = getUserByChatId(chatId)
        if (!user) return bot.sendMessage(msg.chat.id, 'Please run /start first.')

        if (val === 'off') {
            upsertUserPreferences(user.id, { notification_enabled: 0 })
            return bot.sendMessage(msg.chat.id, '✅ Daily notifications disabled.')
        }

        // Parse HH:MM
        const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
        const timeMatch = val.match(timeRegex)
        if (!timeMatch) {
            return bot.sendMessage(msg.chat.id, 'Format: /setnotify HH:MM (e.g. 08:30) or /setnotify off')
        }

        const hour = parseInt(timeMatch[1], 10)
        const minute = parseInt(timeMatch[2], 10)

        upsertUserPreferences(user.id, {
            notification_enabled: 1,
            notification_hour: hour,
            notification_minute: minute
        })

        bot.sendMessage(msg.chat.id, `✅ Daily notifications enabled for **${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}**.`, { parse_mode: 'Markdown' })
    } catch (error) {
        logger.error('Error in /setnotify', { error })
    }
}
