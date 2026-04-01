# TabloCrawler Setup Guide

## Quick Setup

### 1. Install Dependencies
```bash
bun install
```

### 2. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual credentials
# Required: TABLO_AUTH_TOKEN
# Optional: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

### 3. Set Up Monitored Users (for user monitoring feature)
```bash
# Edit monitored-users.txt with actual user IDs
# Format: one user ID per line, comments start with #
```

### 4. Run the Application

#### Regular Table Scanning
```bash
bun run src/index.ts scan
```

#### User Monitoring
```bash
bun run src/index.ts watch-users
```

#### List Restaurant Users
```bash
bun run src/index.ts users --id-ristorante 12345
```

## VS Code Setup

1. Open the project in VS Code
2. Run task: `Ctrl+Shift+P` → "Tasks: Run Task" → "Setup Environment File"
3. Edit the created `.env` file with your credentials
4. Use the debug configurations: `Ctrl+Shift+D` → Select configuration → `F5`

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TABLO_AUTH_TOKEN` | Your Tablo API authentication token | Yes | - |
| `API_BASE_URL` | Tablo API base URL | No | https://api.tabloapp.com |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | No | - |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for notifications | No | - |
| `SEARCH_LATITUDE` | Search center latitude | No | 45.408153 (Padova) |
| `SEARCH_LONGITUDE` | Search center longitude | No | 11.875273 (Padova) |
| `SEARCH_RADIUS` | Search radius in km | No | 4 |
| `USER_IDS_FILE_PATH` | Path to monitored users file | No | monitored-users.txt |
| `STATE_FILE_PATH` | Path to monitoring state file | No | monitoring-state.json |
| `MONITORING_INTERVAL_SECONDS` | Scan interval for monitoring | No | 60 |
| `DAYS_TO_SCAN` | Number of days to scan ahead | No | 3 |
| `MIN_PARTICIPANTS` | Minimum participants filter | No | 2 |
| `MAX_DISTANCE` | Maximum distance filter (km) | No | 10.0 |
| `LOGGING_ENABLED` | Enable detailed logging | No | true |

## Troubleshooting

### Missing Auth Token
```
Error: Missing auth token (--auth.token or TABLO_AUTH_TOKEN)
```
**Solution**: Set `TABLO_AUTH_TOKEN` in your `.env` file

### No User IDs to Monitor
```
Warning: No user IDs to monitor
```
**Solution**: Add valid user IDs to `monitored-users.txt`

### Telegram Notifications Not Working
**Solution**: Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env` file

### API Rate Limiting
**Solution**: Increase `MONITORING_INTERVAL_SECONDS` in `.env` file