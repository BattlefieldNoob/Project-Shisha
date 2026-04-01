import TelegramBot from 'node-telegram-bot-api'
import { upsertUser, upsertUserPreferences, getUserByChatId } from '../../db/index'
import { logger } from '../../config/logging'

export function handleStart(bot: TelegramBot, msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString()

    try {
        upsertUser(chatId)
        const user = getUserByChatId(chatId)

        if (user) {
            // Create default preferences
            upsertUserPreferences(user.id, {})

            const welcomeMsg = `🚗 **Welcome to Fuel Advisor!**\n\n` +
                `I will help you decide when it's the best time to refuel your car based on historical prices in your area.\n\n` +
                `Here is what you can do:\n` +
                `- /today : See today's price and get a tailored recommendation.\n` +
                `- /settings : View and change your preferences (stations list, fuel type, etc.).\n\n` +
                `Let's get started by visiting /settings to configure your primary fuel station!`

            bot.sendMessage(msg.chat.id, welcomeMsg, { parse_mode: 'Markdown' })
        }
    } catch (error) {
        logger.error('Error in /start command', { error })
        bot.sendMessage(msg.chat.id, 'Sorry, there was an error registering your account.')
    }
}
