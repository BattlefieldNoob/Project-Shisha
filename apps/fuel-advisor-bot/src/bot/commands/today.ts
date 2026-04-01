import TelegramBot from 'node-telegram-bot-api'
import { getUserByChatId, getUserPreferences, getStationById } from '../../db/index'
import { getAdvice } from '../../advisor/advisor'
import { formatAdviceMessage, getTankLevelKeyboard, formatStationDetails } from '../../utils/telegram'
import { logger } from '../../config/logging'

export async function handleToday(bot: TelegramBot, msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString()

    try {
        const user = getUserByChatId(chatId)
        if (!user) {
            return bot.sendMessage(msg.chat.id, 'Please run /start first.')
        }

        const prefs = getUserPreferences(user.id)
        if (!prefs || !prefs.fuel_type || !prefs.favorite_stations || prefs.favorite_stations.length === 0) {
            return bot.sendMessage(msg.chat.id, 'You need to configure your favorite stations and fuel type first.\nGo to /settings.')
        }

        let combinedMessage = "📊 **Today's Fuel Advice**\n\n"

        for (const stationId of prefs.favorite_stations) {
            const station = getStationById(stationId)
            if (!station) continue

            // Default level to 0.5 (half tank) for the "today" overview
            const advice = await getAdvice({
                stationId: station.id,
                fuelType: prefs.fuel_type as any,
                level: 0.5
            })

            combinedMessage += formatAdviceMessage(formatStationDetails(station), advice, false) + '\n'
        }

        combinedMessage += '💬 **Want a recommendation?**\nHow much fuel do you have in the tank right now?'

        bot.sendMessage(msg.chat.id, combinedMessage, {
            parse_mode: 'Markdown',
            reply_markup: getTankLevelKeyboard()
        })

    } catch (error) {
        logger.error('Error in /today command', { error })
        bot.sendMessage(msg.chat.id, 'Sorry, something went wrong while getting today\'s advice.')
    }
}

export async function handleAdviceCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery) {
    if (!query.data || !query.message) return

    const chatId = query.message.chat.id
    const levelStr = query.data.replace('LEVEL_', '')
    const level = parseFloat(levelStr)

    try {
        const user = getUserByChatId(chatId.toString())
        if (!user) return

        const prefs = getUserPreferences(user.id)
        if (!prefs || !prefs.fuel_type || !prefs.favorite_stations || prefs.favorite_stations.length === 0) return

        let combinedMessage = `📊 **Advice for Tank Level: ${level * 100}%**\n\n`

        for (const stationId of prefs.favorite_stations) {
            const station = getStationById(stationId)
            if (!station) continue

            const advice = await getAdvice({
                stationId: station.id,
                fuelType: prefs.fuel_type as any,
                level
            })

            combinedMessage += formatAdviceMessage(formatStationDetails(station), advice, true) + '\n'
        }

        // Update the message that had the inline keyboard
        bot.editMessageText(combinedMessage, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
        })

        // Answer the callback to remove the "loading" spinner on the button
        bot.answerCallbackQuery(query.id)

    } catch (error) {
        logger.error('Error handling advice callback', { error })
        bot.answerCallbackQuery(query.id, { text: 'Something went wrong', show_alert: true })
    }
}
