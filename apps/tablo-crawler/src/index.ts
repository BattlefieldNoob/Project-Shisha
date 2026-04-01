#!/usr/bin/env bun
import { Command } from "commander";
import { buildConfig } from "./config";
import { formatHeartbeatMessage } from "./format";
import { InMemoryHeartbeatTracker } from "./heartbeat-tracker";
import { TabloClient } from "./http";
import { ConsoleMessageService, TelegramMessageService } from "./message";
import { createMonitoringNotifier } from "./monitoring-notifier";
import { scanMultipleDays } from "./scanner";
import { JsonStateManager } from "./state-manager";
import { DefaultTableTracker } from "./table-tracker";
import { FileUserLoader } from "./user-loader";
import { createUserMonitor } from "./user-monitor";
import { usersCmd } from "./users";

const program = new Command();
program
  .name("tablocrawler")
  .description("TabloCrawler CLI (Bun)")
  .version("0.1.0");

program
  .command("users")
  .description("List users for a restaurant")
  .requiredOption("--id-ristorante <id>", "Restaurant ID")
  .option("--min-partecipazioni <n>", "Minimum participations")
  .option("--api.base.url <url>", "API base URL")
  .option("--auth.token <token>", "Auth token")
  .action(async (opts: { idRistorante: string; minPartecipazioni?: string; apiBaseUrl?: string; authToken?: string; }) => {
    const args: string[] = [
      "--id-ristorante", opts.idRistorante,
      ...(opts.minPartecipazioni ? ["--min-partecipazioni", opts.minPartecipazioni] : []),
      ...(opts.apiBaseUrl ? ["--api.base.url", opts.apiBaseUrl] : []),
      ...(opts.authToken ? ["--auth.token", opts.authToken] : []),
    ];
    await usersCmd(args);
  });

program
  .command("scan")
  .description("Scan tables across multiple days")
  .option("--days <n>", "Days to scan")
  .option("--min-participants <n>", "Minimum participants")
  .option("--max-distance <km>", "Maximum distance in km")
  .option("--latitude <lat>", "Search latitude (default: Padova)")
  .option("--longitude <lng>", "Search longitude (default: Padova)")
  .option("--search-radius <km>", "Search radius in km")
  .option("--api.base.url <url>", "API base URL")
  .option("--auth.token <token>", "Auth token")
  .option("--telegram.bot.token <token>", "Telegram bot token")
  .option("--telegram.chat.id <id>", "Telegram chat id")
  .action(async (opts: any) => {
    const config = buildConfig({
      baseUrl: opts.apiBaseUrl,
      authToken: opts.authToken,
      daysToScan: opts.days ? Number(opts.days) : undefined,
      minParticipants: opts.minParticipants ? Number(opts.minParticipants) : undefined,
      maxDistance: opts.maxDistance ? Number(opts.maxDistance) : undefined,
      latitude: opts.latitude,
      longitude: opts.longitude,
      searchRadius: opts.searchRadius,
      telegramBotToken: opts.telegram?.bot?.token ?? opts["telegram.bot.token"],
      telegramChatId: opts.telegram?.chat?.id ?? opts["telegram.chat.id"],
    });
    if (!config.authToken) throw new Error("Missing auth token (--auth.token or TABLO_AUTH_TOKEN)");
    const client = new TabloClient(config.baseUrl, config.authToken, {
      maxRetries: config.maxRetries,
      retryDelayMs: config.retryDelayMs,
      retryBackoffMultiplier: config.retryBackoffMultiplier
    });
    const message = (config.enableTelegramNotifications && config.telegramBotToken && config.telegramChatId)
      ? new TelegramMessageService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleMessageService();

    // Create heartbeat tracker
    const tracker = new InMemoryHeartbeatTracker(config.heartbeatIntervalDays);

    await scanMultipleDays(client, message, config, tracker);

    // Check if heartbeat should be sent after scan
    if (tracker.shouldSendHeartbeat()) {
      const heartbeatMsg = formatHeartbeatMessage(tracker.getDaysSinceLastMessage());
      await message.send(heartbeatMsg);
      tracker.recordMessageSent();
    }
  });

program
  .command("watch-users")
  .description("Monitor specific users and/or restaurants for table activity")
  .option("--user-ids-file <path>", "Path to file containing user IDs to monitor")
  .option("--restaurant-ids-file <path>", "Path to file containing restaurant IDs to monitor")
  .option("--state-file <path>", "Path to state persistence file")
  .option("--scan-interval <seconds>", "Scan interval in seconds")
  .option("--days <n>", "Days to scan")
  .option("--latitude <lat>", "Search latitude (default: Padova)")
  .option("--longitude <lng>", "Search longitude (default: Padova)")
  .option("--search-radius <km>", "Search radius in km")
  .option("--api.base.url <url>", "API base URL")
  .option("--auth.token <token>", "Auth token")
  .option("--telegram.bot.token <token>", "Telegram bot token")
  .option("--telegram.chat.id <id>", "Telegram chat id")
  .action(async (opts: any) => {
    const config = buildConfig({
      baseUrl: opts.apiBaseUrl,
      authToken: opts.authToken,
      userIdsFilePath: opts.userIdsFile,
      restaurantIdsFilePath: opts.restaurantIdsFile,
      stateFilePath: opts.stateFile,
      monitoringIntervalSeconds: opts.scanInterval ? Number(opts.scanInterval) : undefined,
      daysToScan: opts.days ? Number(opts.days) : undefined,
      latitude: opts.latitude,
      longitude: opts.longitude,
      searchRadius: opts.searchRadius,
      telegramBotToken: opts.telegram?.bot?.token ?? opts["telegram.bot.token"],
      telegramChatId: opts.telegram?.chat?.id ?? opts["telegram.chat.id"],
    });

    if (!config.authToken) {
      throw new Error("Missing auth token (--auth.token or TABLO_AUTH_TOKEN)");
    }

    // Create shared services
    const client = new TabloClient(config.baseUrl, config.authToken, {
      maxRetries: config.maxRetries,
      retryDelayMs: config.retryDelayMs,
      retryBackoffMultiplier: config.retryBackoffMultiplier
    });
    const messageService = (config.enableTelegramNotifications && config.telegramBotToken && config.telegramChatId)
      ? new TelegramMessageService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleMessageService();

    const stateManager = new JsonStateManager();
    const notifier = createMonitoringNotifier(messageService);

    // Load both user IDs and restaurant IDs to determine what to monitor
    const userLoader = new FileUserLoader();
    const userIds = await userLoader.loadUserIds(config.userIdsFilePath);

    const { FileRestaurantLoader } = await import("./restaurant-loader.js");
    const restaurantLoader = new FileRestaurantLoader();
    const restaurantIds = await restaurantLoader.loadRestaurantIds(config.restaurantIdsFilePath);

    const hasUsers = userIds.length > 0;
    const hasRestaurants = restaurantIds.length > 0;

    // Check if neither is configured
    if (!hasUsers && !hasRestaurants) {
      console.warn('⚠️  WARNING: No users or restaurants configured for monitoring.');
      console.warn(`   User IDs file: ${config.userIdsFilePath}`);
      console.warn(`   Restaurant IDs file: ${config.restaurantIdsFilePath}`);
      console.warn('   Please add at least one user ID or restaurant ID to start monitoring.');
      process.exit(1);
    }

    // Determine which monitors to run
    if (hasUsers && hasRestaurants) {
      console.log('🔄 Both user and restaurant monitoring enabled - running in parallel mode');

      // Create both monitors
      const tableTracker = new DefaultTableTracker();
      const userMonitor = createUserMonitor(
        client,
        userLoader,
        stateManager,
        tableTracker,
        notifier
      );

      const { createRestaurantMonitor } = await import("./restaurant-monitor.js");
      const restaurantMonitor = createRestaurantMonitor(
        client,
        restaurantLoader,
        stateManager,
        notifier
      );

      // Run both monitors in parallel
      await Promise.all([
        userMonitor.startMonitoring(config),
        restaurantMonitor.startMonitoring(config)
      ]);
    } else if (hasUsers) {
      console.log('👥 User monitoring enabled');

      // Run only user monitor
      const tableTracker = new DefaultTableTracker();
      const userMonitor = createUserMonitor(
        client,
        userLoader,
        stateManager,
        tableTracker,
        notifier
      );

      await userMonitor.startMonitoring(config);
    } else {
      console.log('🏪 Restaurant monitoring enabled');

      // Run only restaurant monitor
      const { createRestaurantMonitor } = await import("./restaurant-monitor.js");
      const restaurantMonitor = createRestaurantMonitor(
        client,
        restaurantLoader,
        stateManager,
        notifier
      );

      await restaurantMonitor.startMonitoring(config);
    }
  });

program.parse(Bun.argv);
