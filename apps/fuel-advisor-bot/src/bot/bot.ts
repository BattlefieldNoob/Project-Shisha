import TelegramBot from 'node-telegram-bot-api'
import { config } from '../config/env'
import { logger } from '../config/logging'

import { handleStart } from './commands/start'
import { handleToday, handleAdviceCallback } from './commands/today'
import { handleHelp } from './commands/help'
import { handleSettings, handleAddStation, handleRemoveStation, handleSetFuel, handleSetNotify } from './commands/settings'
import { handleLocation } from './commands/search'
import { getUserByChatId, getStationByMimitId, addFavoriteStation } from '../db/index'

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

  // Settings commands
  bot.onText(/^\/addstation\s+(.+)$/, (msg, match) => handleAddStation(bot!, msg, match))
  bot.onText(/^\/removestation\s+(.+)$/, (msg, match) => handleRemoveStation(bot!, msg, match))
  bot.onText(/^\/setfuel\s+(.+)$/, (msg, match) => handleSetFuel(bot!, msg, match))
  bot.onText(/^\/setnotify\s+(.+)$/, (msg, match) => handleSetNotify(bot!, msg, match))

  // Callbacks
  bot.on('callback_query', (query) => {
    if (query.data?.startsWith('LEVEL_')) {
      handleAdviceCallback(bot!, query)
    } else if (query.data?.startsWith('ADD_STATION_')) {
      const mimitId = query.data.replace('ADD_STATION_', '')
      const msg = query.message
      if (msg) {
        const user = getUserByChatId(msg.chat.id.toString())
        if (user) {
          const station = getStationByMimitId(mimitId) as { id: number, name: string } | undefined
          if (station) {
            addFavoriteStation(user.id, station.id)
            bot?.answerCallbackQuery(query.id, { text: `✅ Added ${station.name} to favorites!`, show_alert: true })
          } else {
            bot?.answerCallbackQuery(query.id, { text: 'Station not found.', show_alert: true })
          }
        }
      }
    }
  })

  bot.on('polling_error', (err) => logger.error('Telegram polling error', { error: err }))
  logger.info('Telegram bot started')
}

export function getBot(): TelegramBot | null {
  return bot
}
