import TelegramBot from 'node-telegram-bot-api'
import { config } from '../config/env'
import { logger } from '../config/logging'

import { handleStart } from './commands/start'
import { handleToday, handleAdviceCallback } from './commands/today'
import { handleHelp } from './commands/help'
import { handleSettings, handleAddStation, handleRemoveStation, handleSetFuel, handleSetNotify } from './commands/settings'
import { handleLocation } from './commands/search'
import { getUserByChatId, getStationByMimitId, addFavoriteStation, removeFavoriteStation, upsertUserPreferences, getUserPreferences } from '../db/index'

let bot: TelegramBot | null = null

export function startBot() {
  if (bot) return

  if (!config.TELEGRAM_TOKEN) {
    logger.warn('TELEGRAM_TOKEN is not set. Bot will not start.')
    return
  }

  bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true })

  // Commands
  bot.onText(/^\/start$/, (msg) => handleStart(bot!, msg))
  bot.onText(/^\/today$/, (msg) => handleToday(bot!, msg))
  bot.onText(/^\/settings$/, (msg) => handleSettings(bot!, msg))
  bot.onText(/^\/help$/, (msg) => handleHelp(bot!, msg))

  // Location handler
  bot.on('location', (msg) => handleLocation(bot!, msg))

  // Settings commands (with or without arguments)
  bot.onText(/^\/addstation(?:\s+(.+))?$/, (msg, match) => handleAddStation(bot!, msg, match))
  bot.onText(/^\/removestation(?:\s+(.+))?$/, (msg, match) => handleRemoveStation(bot!, msg, match))
  bot.onText(/^\/setfuel(?:\s+(.+))?$/, (msg, match) => handleSetFuel(bot!, msg, match))
  bot.onText(/^\/setnotify(?:\s+(.+))?$/, (msg, match) => handleSetNotify(bot!, msg, match))

  // Callbacks
  bot.on('callback_query', (query) => {
    const chatId = query.message?.chat.id
    const user = chatId ? getUserByChatId(chatId.toString()) : null
    const data = query.data

    if (!data || !query.message) {
      bot?.answerCallbackQuery(query.id)
      return
    }

    // Handle tank level selection (existing)
    if (data.startsWith('LEVEL_')) {
      return handleAdviceCallback(bot!, query)
    }

    // Handle add station (existing)
    if (data.startsWith('ADD_STATION_')) {
      const mimitId = data.replace('ADD_STATION_', '')
      if (user) {
        const station = getStationByMimitId(mimitId) as { id: number, name: string } | undefined
        if (station) {
          addFavoriteStation(user.id, station.id)
          bot?.answerCallbackQuery(query.id, { text: `✅ Added ${station.name} to favorites!`, show_alert: true })
        } else {
          bot?.answerCallbackQuery(query.id, { text: 'Station not found.', show_alert: true })
        }
      } else {
        bot?.answerCallbackQuery(query.id, { text: 'Please run /start first.', show_alert: true })
      }
      return
    }

    // Handle fuel type selection (new)
    if (data.startsWith('FUEL_')) {
      const fuelType = data.replace('FUEL_', '')
      if (user) {
        upsertUserPreferences(user.id, { fuel_type: fuelType })
        const emoji = fuelType === 'GASOLINE' ? '⛽' : '🚛'
        const fuelName = fuelType === 'GASOLINE' ? 'Benzina' : 'Gasolio'

        // Update the message
        bot!.editMessageText(
          `✅ Fuel type set to: **${fuelType}** (${emoji} ${fuelName})`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'Markdown'
          }
        )
        bot?.answerCallbackQuery(query.id)
      } else {
        bot?.answerCallbackQuery(query.id, { text: 'Please run /start first.', show_alert: true })
      }
      return
    }

    // Handle notification time selection (new)
    if (data.startsWith('NOTIFY_')) {
      const timeValue = data.replace('NOTIFY_', '')

      if (user) {
        if (timeValue === 'off') {
          upsertUserPreferences(user.id, { notification_enabled: 0 })
          bot!.editMessageText(
            '✅ Daily notifications disabled.',
            {
              chat_id: chatId,
              message_id: query.message.message_id
            }
          )
        } else {
          // Parse HH:MM format
          const [hour, minute] = timeValue.split(':').map(Number)
          if (!isNaN(hour) && !isNaN(minute)) {
            upsertUserPreferences(user.id, {
              notification_enabled: 1,
              notification_hour: hour,
              notification_minute: minute
            })
            bot!.editMessageText(
              `✅ Daily notifications enabled for **${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}**.`,
              {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'Markdown'
              }
            )
          }
        }
        bot?.answerCallbackQuery(query.id)
      } else {
        bot?.answerCallbackQuery(query.id, { text: 'Please run /start first.', show_alert: true })
      }
      return
    }

    // Handle remove station (new)
    if (data.startsWith('REMOVE_STATION_')) {
      const mimitId = data.replace('REMOVE_STATION_', '')

      if (user) {
        const station = getStationByMimitId(mimitId) as { id: number, name: string } | undefined
        if (station) {
          removeFavoriteStation(user.id, station.id)
          bot!.editMessageText(
            `✅ Removed from favorites: **${station.name}**`,
            {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown'
            }
          )
          bot?.answerCallbackQuery(query.id)
        } else {
          bot?.answerCallbackQuery(query.id, { text: 'Station not found.', show_alert: true })
        }
      } else {
        bot?.answerCallbackQuery(query.id, { text: 'Please run /start first.', show_alert: true })
      }
      return
    }

    // Handle cancel button (new)
    if (data === 'REMOVE_CANCEL') {
      bot!.editMessageText(
        '❌ Operation cancelled.',
        {
          chat_id: chatId,
          message_id: query.message.message_id
        }
      )
      bot?.answerCallbackQuery(query.id)
      return
    }

    // Unknown callback - just answer
    bot?.answerCallbackQuery(query.id)
  })

  bot.on('polling_error', (err) => logger.error('Telegram polling error', { error: err }))
  logger.info('Telegram bot started')
}

export function getBot(): TelegramBot | null {
  return bot
}
