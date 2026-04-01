import TelegramBot from 'node-telegram-bot-api'

export function handleHelp(bot: TelegramBot, msg: TelegramBot.Message) {
    const helpMsg = `📖 **Fuel Advisor Help**\n\n` +
        `This bot helps you find the best time to refuel based on open data from MIMIT.\n\n` +
        `**Available Commands:**\n` +
        `- /today : Shows today's prices for your favorite stations and asks for your tank level to provide advice.\n` +
        `- /settings : View and manage your preferences.\n` +
        `- /start : Restart the welcome flow.\n` +
        `- /help : Show this help message.\n\n` +
        `**Adding Stations:**\n` +
        `1. Send your **Location** (📎 -> Location) to find stations near you.\n` +
        `2. Click the "**➕ Add**" button under any station result.\n` +
        `*Alternatively, use \`/addstation <MIMIT_ID>\` if you know the ID.*\n\n` +
        `**Managing Settings:**\n` +
        `- \`/setfuel <GASOLINE|DIESEL>\` : Set your preferred fuel type.\n` +
        `- \`/setnotify <HH:MM>\` : Enable daily notifications (e.g., \`/setnotify 08:30\`).\n` +
        `- \`/setnotify off\` : Disable notifications.\n` +
        `- \`/removestation <MIMIT_ID>\` : Remove a station from favorites.\n\n` +
        `**Daily Push:**\n` +
        `If enabled, I will send you a price update every day at your chosen time.`

    bot.sendMessage(msg.chat.id, helpMsg, { parse_mode: 'Markdown' })
}
