import cron from 'node-cron'
import { logger } from '../config/logging'
import { config } from '../config/env'
import { runDailyScrape } from '../scraper/index'
import { getAllUsersWithNotification, getStationById } from '../db/index'
import { getBot } from '../bot/bot'
import { getAdvice } from '../advisor/advisor'
import { formatAdviceMessage, getTankLevelKeyboard, formatStationDetails } from '../utils/telegram'

export function startScheduler() {
  const cronExpression = `${config.SCRAPER_RUN_HOUR} * * * *` // For testing, just hour. If minute was defined we'd use `${minute} ${hour} * * *`
  // Actually, let's use a standard daily cron: minute hour * * *
  // Assuming SCRAPER_RUN_HOUR is just an hour, we can default minute to 0.
  const hour = config.SCRAPER_RUN_HOUR
  const minute = 0 // default

  cron.schedule(`${minute} ${hour} * * *`, async () => {
    logger.info('Scheduled daily scrape triggered')
    try {
      await runDailyScrape()
    } catch (err) {
      logger.error('Scheduled daily scrape failed', { error: err })
    }
  })

  logger.info(`Scheduler started (daily scrape at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')})`)

  // Notification job: Runs every minute to see if any user needs a notification
  cron.schedule('* * * * *', async () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    try {
      const users = getAllUsersWithNotification()

      for (const user of users) {
        if (user.notification_hour === currentHour && user.notification_minute === currentMinute) {
          logger.info(`Sending daily notification to chat_id ${user.telegram_chat_id}`)

          if (!user.fuel_type || !user.favorite_stations || user.favorite_stations.length === 0) continue

          let combinedMessage = ''
          for (const stationId of user.favorite_stations) {
            const station = getStationById(stationId)
            if (!station) continue

            const advice = await getAdvice({
              stationId: station.id,
              fuelType: user.fuel_type as any,
              level: 0.5  // assume half tank for daily push
            })

            combinedMessage += formatAdviceMessage(formatStationDetails(station), advice, false) + '\n'
          }

          if (!combinedMessage) continue

          combinedMessage += '💬 **Want a recommendation?**\nHow much fuel do you have in the tank right now?'

          const bot = getBot()
          if (bot) {
            bot.sendMessage(user.telegram_chat_id, `🔔 **Daily Fuel Update**\n\n` + combinedMessage, {
              parse_mode: 'Markdown',
              reply_markup: getTankLevelKeyboard()
            }).catch((e: Error) => logger.error(`Failed to send notification to ${user.telegram_chat_id}`, { error: e }))
          }
        }
      }
    } catch (err) {
      logger.error('Error running notification job', { error: err })
    }
  })
  logger.info('Notification scheduler started')
}
