import TelegramBot from 'node-telegram-bot-api'
import { getAllStations, getUserByChatId } from '../../db/index'
import { calculateDistance, formatStationDetails } from '../../utils/telegram'
import { logger } from '../../config/logging'

export function handleLocation(bot: TelegramBot, msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString()
    const location = msg.location

    if (!location) return

    try {
        const user = getUserByChatId(chatId)
        if (!user) return bot.sendMessage(msg.chat.id, 'Please run /start first.')

        bot.sendMessage(msg.chat.id, '📍 Searching for stations near you...')

        const allStations = getAllStations()
        const stationsWithDistance = allStations
            .filter(s => s.latitude && s.longitude)
            .map(s => {
                const distanceKm = calculateDistance(location.latitude, location.longitude, s.latitude, s.longitude)
                return { ...s, distanceKm }
            })
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 5)

        if (stationsWithDistance.length === 0) {
            return bot.sendMessage(msg.chat.id, 'No stations found near you.')
        }

        let responseMsg = `📍 **Top 5 Nearest Stations:**\n\n`

        // We will send a single message with inline buttons for each station
        const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = []

        stationsWithDistance.forEach((station, index) => {
            const distStr = station.distanceKm < 1
                ? `${Math.round(station.distanceKm * 1000)}m`
                : `${station.distanceKm.toFixed(1)}km`

            responseMsg += `**${index + 1}.** ${formatStationDetails(station)}\n`
            responseMsg += `📏 Distance: ${distStr}\n\n`

            inlineKeyboard.push([
                { text: `➕ Add ${station.brand && station.brand !== 'Pompe Bianche' ? station.brand : station.name}`, callback_data: `ADD_STATION_${station.mimit_id}` }
            ])
        })

        bot.sendMessage(msg.chat.id, responseMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        })

    } catch (error) {
        logger.error('Error handling location message', { error })
        bot.sendMessage(msg.chat.id, 'Sorry, something went wrong while searching for stations.')
    }
}
