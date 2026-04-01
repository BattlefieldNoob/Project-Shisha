# User Monitoring Feature

This document explains how to use the user monitoring feature of TabloCrawler.

## Overview

The user monitoring feature allows you to track specific users and get notifications when they join or leave tables, when other participants join/leave tables they're at, or when table details change.

## Quick Start

### 1. Set up your environment file

First, create your environment configuration:

```bash
# Copy the example file
cp .env.example .env

# Or use VS Code task: Ctrl+Shift+P → "Tasks: Run Task" → "Setup Environment File"
```

Edit the `.env` file with your actual credentials:

```env
# Required
TABLO_AUTH_TOKEN=your_actual_token_here

# Optional - for Telegram notifications
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### 2. Set up your monitored users file

Create or edit `monitored-users.txt` with the user IDs you want to monitor:

```
# Monitored Users Configuration
123456  # John Doe - frequent diner
789012  # Jane Smith - social organizer
345678  # Mike Johnson - weekend regular
```

### 3. Run the monitoring service

```bash
# Basic monitoring (uses .env file for credentials)
bun run src/index.ts watch-users

# With custom settings (still uses .env for credentials)
bun run src/index.ts watch-users --user-ids-file monitored-users.txt --scan-interval 60 --days 3

# Override environment variables if needed
TABLO_AUTH_TOKEN=your_token TELEGRAM_BOT_TOKEN=your_bot_token bun run src/index.ts watch-users
```

## VS Code Integration

### Launch Configurations

Use the provided VS Code launch configurations:

1. **Watch Users - Development**: Full monitoring with Telegram support (uses .env file)
2. **Watch Users - Quick Test**: Quick test with 30-second intervals (uses .env file)
3. **Regular Scan - Development**: Traditional table scanning (uses .env file)
4. **List Users for Restaurant**: List users for a specific restaurant (uses .env file)
5. **Watch Users - Manual Input (Fallback)**: Prompts for credentials if .env file is not available

To use:
1. Set up your `.env` file (see step 2 above)
2. Open VS Code
3. Go to Run and Debug (Ctrl+Shift+D)
4. Select a configuration from the dropdown
5. Press F5 or click the play button

### Tasks

Available VS Code tasks (Ctrl+Shift+P → "Tasks: Run Task"):

- **Install Dependencies**: Run `bun install`
- **Setup Environment File**: Create `.env` file from `.env.example`
- **Test User Loading**: Test loading users from the monitored-users.txt file
- **Clean State Files**: Remove monitoring state files

## Command Line Options

```
Usage: tablocrawler watch-users [options]

Options:
  --user-ids-file <path>        Path to file containing user IDs to monitor (default: monitored-users.txt)
  --state-file <path>           Path to state persistence file (default: monitoring-state.json)
  --scan-interval <seconds>     Scan interval in seconds (default: 60)
  --days <n>                    Days to scan (default: 3)
  --latitude <lat>              Search latitude (default: Padova)
  --longitude <lng>             Search longitude (default: Padova)
  --search-radius <km>          Search radius in km (default: 4)
  --api.base.url <url>          API base URL (default: https://api.tabloapp.com)
  --auth.token <token>          Auth token (or use TABLO_AUTH_TOKEN env var)
  --telegram.bot.token <token>  Telegram bot token (or use TELEGRAM_BOT_TOKEN env var)
  --telegram.chat.id <id>       Telegram chat id (or use TELEGRAM_CHAT_ID env var)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TABLO_AUTH_TOKEN` | Your Tablo authentication token | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | No |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for notifications | No |
| `SEARCH_LATITUDE` | Search center latitude | No (default: 45.408153 - Padova) |
| `SEARCH_LONGITUDE` | Search center longitude | No (default: 11.875273 - Padova) |
| `SEARCH_RADIUS` | Search radius in km | No (default: 4) |
| `USER_IDS_FILE_PATH` | Path to user IDs file | No (default: monitored-users.txt) |
| `STATE_FILE_PATH` | Path to state file | No (default: monitoring-state.json) |
| `MONITORING_INTERVAL_SECONDS` | Scan interval in seconds | No (default: 60) |

## Notification Types

The service sends different types of notifications:

### 1. User Joined Table
When a monitored user joins a table:
- Shows user details (name, age, gender)
- Lists other participants
- Shows table statistics

### 2. User Left Table
When a monitored user leaves a table:
- Shows which user left
- Shows restaurant and table information

### 3. Participant Changes
When someone joins/leaves a table with monitored users:
- Shows who joined/left
- Lists monitored users still at the table
- Shows current table composition

### 4. Table Updates
When table details change (same participants, different info):
- Shows updated table information
- Lists monitored users at the table

## File Formats

### User IDs File (monitored-users.txt)

```
# Comments start with #
# Empty lines are ignored

123456  # Optional comment about the user
789012  # Another user
# 111222  # Commented out (disabled) user
```

### State File (monitoring-state.json)

The state file is automatically managed and contains:
- Current table states with monitored users
- List of monitored user IDs
- Last scan timestamp

**Don't edit this file manually** - it's automatically updated by the service.

## Troubleshooting

### Common Issues

1. **"Missing auth token" error**
   - Set the `TABLO_AUTH_TOKEN` environment variable
   - Or use `--auth.token` command line option

2. **"No user IDs to monitor" warning**
   - Check that `monitored-users.txt` exists and contains valid user IDs
   - Make sure user IDs are positive integers

3. **API rate limiting**
   - Increase scan interval with `--scan-interval`
   - The service has built-in retry logic with exponential backoff

4. **Telegram notifications not working**
   - Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set correctly
   - The service will fall back to console output if Telegram fails

### Logs and Debugging

The service provides detailed logging:
- 🚀 Service startup information
- 📅 Daily scan progress
- 👥 Monitored users found in tables
- 📢 Change notifications
- ❌ Error messages with context
- ✅ Success confirmations

### Performance Tips

- Use reasonable scan intervals (60+ seconds recommended)
- Monitor only essential users to reduce API calls
- The service automatically handles API failures and continues running

## Security Notes

- Keep your `TABLO_AUTH_TOKEN` secure and don't commit it to version control
- The token is marked as password in VS Code launch configurations
- Consider using environment variables instead of command line arguments for tokens