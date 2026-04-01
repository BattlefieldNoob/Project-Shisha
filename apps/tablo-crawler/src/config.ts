export interface AppConfig {
  baseUrl: string;
  authToken: string;
  enableLogging: boolean;
  enableTelegramNotifications: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  daysToScan: number;
  minParticipants: number;
  maxDistance: number; // km
  intervalSeconds: number; // for loop mode
  // Location and search parameters
  latitude: string;
  longitude: string;
  searchRadius: string; // km
  // User monitoring configuration
  userIdsFilePath: string;
  stateFilePath: string;
  monitoringIntervalSeconds: number;
  // Restaurant monitoring configuration
  restaurantIdsFilePath: string;
  // Retry configuration
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  // Grace period configuration
  gracePeriodScans: number;
  // Heartbeat configuration
  heartbeatIntervalDays: number;
  // Female notification configuration
  femaleNotificationMinAge: number;
  femaleNotificationMaxAge: number;
}

export function buildConfig(partial: Partial<AppConfig>): AppConfig {
  return {
    baseUrl: partial.baseUrl ?? Bun.env.API_BASE_URL ?? "https://api.tabloapp.com",
    authToken: partial.authToken ?? Bun.env.TABLO_AUTH_TOKEN ?? "",
    enableLogging: partial.enableLogging ?? (Bun.env.LOGGING_ENABLED?.toLowerCase() === "true" || true),
    enableTelegramNotifications: partial.enableTelegramNotifications ?? (Bun.env.TELEGRAM_NOTIFICATIONS_ENABLED?.toLowerCase() === "true" || true),
    telegramBotToken: partial.telegramBotToken ?? Bun.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: partial.telegramChatId ?? Bun.env.TELEGRAM_CHAT_ID,
    daysToScan: partial.daysToScan ?? Number(Bun.env.DAYS_TO_SCAN ?? 3),
    minParticipants: partial.minParticipants ?? Number(Bun.env.MIN_PARTICIPANTS ?? 2),
    maxDistance: partial.maxDistance ?? Number(Bun.env.MAX_DISTANCE ?? 10.0),
    intervalSeconds: partial.intervalSeconds ?? Number(Bun.env.INTERVAL_SECONDS ?? 300),
    // Location and search parameters (defaults to Padova, Italy)
    latitude: partial.latitude ?? Bun.env.SEARCH_LATITUDE ?? "45.408153",
    longitude: partial.longitude ?? Bun.env.SEARCH_LONGITUDE ?? "11.875273",
    searchRadius: partial.searchRadius ?? Bun.env.SEARCH_RADIUS ?? "4",
    // User monitoring configuration
    userIdsFilePath: partial.userIdsFilePath ?? Bun.env.USER_IDS_FILE_PATH ?? "monitored-users.txt",
    stateFilePath: partial.stateFilePath ?? Bun.env.STATE_FILE_PATH ?? "monitoring-state.json",
    monitoringIntervalSeconds: partial.monitoringIntervalSeconds ?? Number(Bun.env.MONITORING_INTERVAL_SECONDS ?? 60),
    // Restaurant monitoring configuration
    restaurantIdsFilePath: partial.restaurantIdsFilePath ?? Bun.env.RESTAURANT_IDS_FILE_PATH ?? "monitored-restaurants.txt",
    // Retry configuration
    maxRetries: partial.maxRetries ?? Number(Bun.env.MAX_RETRIES ?? 3),
    retryDelayMs: partial.retryDelayMs ?? Number(Bun.env.RETRY_DELAY_MS ?? 1000),
    retryBackoffMultiplier: partial.retryBackoffMultiplier ?? Number(Bun.env.RETRY_BACKOFF_MULTIPLIER ?? 2),
    // Grace period configuration
    gracePeriodScans: partial.gracePeriodScans ?? Number(Bun.env.GRACE_PERIOD_SCANS ?? 3),
    // Heartbeat configuration
    heartbeatIntervalDays: validateHeartbeatInterval(
      partial.heartbeatIntervalDays ?? Number(Bun.env.HEARTBEAT_INTERVAL_DAYS ?? 2)
    ),
    // Female notification configuration
    femaleNotificationMinAge: partial.femaleNotificationMinAge ?? Number(Bun.env.FEMALE_NOTIFICATION_MIN_AGE ?? 25),
    femaleNotificationMaxAge: partial.femaleNotificationMaxAge ?? Number(Bun.env.FEMALE_NOTIFICATION_MAX_AGE ?? 35),
  };
}

function validateHeartbeatInterval(value: number): number {
  if (!Number.isFinite(value) || value < 1 || value > 7) {
    console.warn(`⚠️  Invalid heartbeat interval: ${value}. Using default of 2 days. Valid range is 1-7 days.`);
    return 2;
  }
  return value;
}

export function requireAuth(config: AppConfig) {
  if (!config.authToken) throw new Error("Missing auth token (use --auth-token or TABLO_AUTH_TOKEN)");
}
