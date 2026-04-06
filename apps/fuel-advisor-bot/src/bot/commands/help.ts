import TelegramBot from 'node-telegram-bot-api'

export function handleHelp(bot: TelegramBot, msg: TelegramBot.Message) {
    const helpMsg = `📖 **Fuel Advisor Help**\n\n` +
        `This bot helps you find the best time to refuel based on open data from MIMIT.\n\n` +
        `**Available Commands:**\n` +
        `- /today : Shows today's prices for your favorite stations.\n` +
        `- /settings : View and manage your preferences.\n` +
        `- /start : Restart the welcome flow.\n` +
        `- /help : Show this help message.\n\n` +
        `**Adding Stations:**\n` +
        `1. Send your **Location** (📎 -> Location) to find stations near you.\n` +
        `2. Click the "**➕ Add**" button under any station result.\n\n` +
        `**Managing Settings:**\n` +
        `- \`/setfuel\` : Set your preferred fuel type (GASOLINE or DIESEL).\n` +
        `- \`/setnotify\` : Set when you want daily price updates.\n` +
        `- \`/removestation\` : Remove a station from your favorites.\n\n` +
        `*All setting commands show interactive buttons when used without arguments.*\n\n` +
        `**Daily Push:**\n` +
        `If enabled, I will send you a price update every day at your chosen time.`

    bot.sendMessage(msg.chat.id, helpMsg, { parse_mode: 'Markdown' })
}
