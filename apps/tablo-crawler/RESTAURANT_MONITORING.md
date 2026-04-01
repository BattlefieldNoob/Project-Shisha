# Restaurant Monitoring Guide

## Overview

Restaurant monitoring is a feature that tracks all table activity within specific restaurants on the Tablo platform. Unlike user monitoring (which tracks specific users across all restaurants), restaurant monitoring focuses on all participants and tables within designated restaurants.

## Key Concepts

### Monitoring Modes

TabloCrawler supports two complementary monitoring modes:

1. **User Monitoring**: Tracks specific users across all restaurants
   - Notifies when monitored users join, leave, or create tables
   - User-centric perspective
   - Configured via `monitored-users.txt`

2. **Restaurant Monitoring**: Tracks all activity within specific restaurants
   - Notifies about all tables created in monitored restaurants
   - Tracks all participant changes regardless of whether they're monitored users
   - Restaurant-centric perspective
   - Configured via `monitored-restaurants.txt`

### Dual Operation

Both monitoring modes can run simultaneously:
- Shared state management and notification services
- Independent change detection logic
- Cross-referenced notifications (indicates when participants are monitored users)
- No interference between modes

## Configuration

### Restaurant IDs File

Create a `monitored-restaurants.txt` file in the project root:

```
# Monitored Restaurants Configuration
# Add one restaurant ID per line
# Lines starting with # are comments

12345  # Trattoria da Mario - favorite Italian spot
67890  # Osteria del Borgo - great for groups
54321  # Pizzeria Napoli

# Temporarily disabled restaurants (commented out)
# 11111  # Under renovation
```

**File Format Rules:**
- One restaurant ID per line
- Full-line comments: Lines starting with `#`
- Inline comments: Text after `#` on the same line as a restaurant ID
- Empty lines are ignored
- Whitespace is trimmed automatically
- Restaurant IDs must be non-empty strings (typically numeric)

### Finding Restaurant IDs

Restaurant IDs can be found:
1. From Tablo API responses when scanning tables
2. Using the `users` command to list users for a restaurant
3. From the Tablo web application URL (if available)

### Environment Variables

```bash
# Restaurant monitoring configuration
export RESTAURANT_IDS_FILE_PATH="monitored-restaurants.txt"

# Optional: Use a custom file path
export RESTAURANT_IDS_FILE_PATH="/path/to/my-restaurants.txt"
```

### CLI Options

```bash
# Specify restaurant IDs file via CLI
bun run src/index.ts watch-users --restaurant-ids-file monitored-restaurants.txt

# Monitor only restaurants (no user monitoring)
bun run src/index.ts watch-users --restaurant-ids-file monitored-restaurants.txt

# Monitor both users and restaurants
bun run src/index.ts watch-users \
  --user-ids-file monitored-users.txt \
  --restaurant-ids-file monitored-restaurants.txt
```

## Notification Types

Restaurant monitoring sends notifications for five types of events:

### 1. New Table Created

Sent when a new table appears in a monitored restaurant.

**Example:**
```
🆕 NEW TABLE CREATED IN MONITORED RESTAURANT

🏪 Restaurant: Trattoria da Mario
📍 Table ID: 789012
📅 Orario: venerdì 24 gennaio 2025, 20:00

👥 Initial Participants (3):
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Laura Bianchi
   ⏳ ♂️ Giuseppe Verdi

📊 Gender Balance:
♂️ Male: 2
♀️ Female: 1

⏰ Detected at: 24/01/2025, 15:30:00
```

**Contains:**
- Restaurant name and table ID
- Scheduled date and time
- Complete participant list with confirmation status
- Gender balance information
- Detection timestamp

### 2. Participant Joined

Sent when a participant joins an existing table in a monitored restaurant.

**Example:**
```
➕ PARTICIPANT JOINED TABLE

🏪 Restaurant: Trattoria da Mario
📍 Table ID: 789012

👤 New Participant:
   ♀️ Sofia Romano (Confirmed)
   🔔 Monitored User: Yes

👥 Current Participants (4):
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Laura Bianchi
   ✅ ♂️ Giuseppe Verdi
   ✅ ♀️ Sofia Romano 🔔

📊 Gender Balance:
♂️ Male: 2
♀️ Female: 2

⏰ Detected at: 24/01/2025, 16:00:00
```

**Contains:**
- New participant details
- Monitored user status (🔔 if they're in monitored-users.txt)
- Updated participant list
- Updated gender balance
- Detection timestamp

**Aggregation:**
- Multiple participants joining in the same scan are included in a single notification
- Each participant is listed separately

### 3. Participant Left

Sent when a participant leaves a table in a monitored restaurant.

**Example:**
```
➖ PARTICIPANT LEFT TABLE

🏪 Restaurant: Trattoria da Mario
📍 Table ID: 789012

👤 Participant Who Left:
   ♂️ Giuseppe Verdi
   🔔 Monitored User: No

👥 Remaining Participants (3):
   ✅ ♂️ Marco Rossi
   ✅ ♀️ Laura Bianchi
   ✅ ♀️ Sofia Romano 🔔

📊 Gender Balance:
♂️ Male: 1
♀️ Female: 2

⏰ Detected at: 24/01/2025, 17:00:00
```

**Contains:**
- Departed participant details
- Monitored user status
- Remaining participant list
- Updated gender balance
- Detection timestamp

**Aggregation:**
- Multiple participants leaving in the same scan are included in a single notification
- Each departed participant is listed separately

### 4. Table Cancelled

Sent when a table disappears before its scheduled time.

**Example:**
```
❌ TABLE CANCELLED

🏪 Restaurant: Trattoria da Mario
📍 Table ID: 789012
📅 Was scheduled for: 24/01/2025, 20:00

⏰ Detected at: 24/01/2025, 18:00:00
```

**Contains:**
- Restaurant name and table ID
- Original scheduled date and time
- Detection timestamp

**Grace Period Protection:**
- Tables aren't immediately marked as cancelled when they disappear
- System waits for a configurable grace period (default: 3 scans)
- Prevents false notifications from temporary API issues
- If table reappears during grace period, no notification is sent

### 5. Table Finished

Sent when a table disappears after its scheduled time.

**Example:**
```
✅ TABLE FINISHED

🏪 Restaurant: Trattoria da Mario
📍 Table ID: 789012
📅 Was scheduled for: 24/01/2025, 20:00

⏰ Detected at: 24/01/2025, 22:30:00
```

**Contains:**
- Restaurant name and table ID
- Original scheduled date and time
- Detection timestamp

**Note:** This indicates the table completed normally (disappeared after the scheduled time).

## Workflow

### Monitoring Loop

1. **Initialization**
   - Load restaurant IDs from `monitored-restaurants.txt`
   - Load previous state from `monitoring-state.json`
   - Validate configuration

2. **Periodic Scanning** (every scan interval, default: 5 minutes)
   - For each monitored restaurant:
     - Fetch tables for multiple days (configurable, default: 3 days)
     - Fetch detailed information for each table
   - Build current state snapshot

3. **Change Detection**
   - Compare previous state with current state
   - Identify new tables, participant changes, and missing tables
   - Apply grace period logic for missing tables

4. **Notification Dispatch**
   - Send appropriate notifications for each detected change
   - Include cross-reference information (monitored user status)

5. **State Persistence**
   - Save current state to `monitoring-state.json`
   - Use atomic file operations to prevent corruption

### State Management

The system maintains state in `monitoring-state.json`:

```json
{
  "restaurantTables": {
    "789012": {
      "idTavolo": "789012",
      "idRistorante": "12345",
      "nomeRistorante": "Trattoria da Mario",
      "partecipanti": [...],
      "quando": "2025-01-24T20:00:00.000Z",
      "firstSeen": "2025-01-24T15:30:00.000Z",
      "lastUpdated": "2025-01-24T16:00:00.000Z"
    }
  },
  "monitoredRestaurants": ["12345", "67890"],
  "monitoredUsers": [210340, 642315],
  "lastScanTime": "2025-01-24T16:00:00.000Z",
  "suspiciousTables": {}
}
```

**State Fields:**
- `restaurantTables`: All tables in monitored restaurants
- `monitoredRestaurants`: List of restaurant IDs being monitored
- `monitoredUsers`: List of user IDs being monitored (for cross-reference)
- `lastScanTime`: Timestamp of last successful scan
- `suspiciousTables`: Tables in grace period (temporarily missing)

## Integration with User Monitoring

### Complementary Perspectives

Restaurant and user monitoring provide different views of the same data:

**User Monitoring:**
- "Where is this person dining?"
- "Who joined a table with my friend?"
- Follows specific individuals

**Restaurant Monitoring:**
- "What's happening at this restaurant?"
- "Who's dining here tonight?"
- Tracks venue activity

### Cross-Referenced Notifications

When a table involves both a monitored restaurant and a monitored user:
- Both monitoring systems detect the event
- Each sends its own notification with appropriate context
- Restaurant notifications include 🔔 indicator for monitored users
- User notifications include restaurant information

**Example Scenario:**
- Restaurant "Trattoria da Mario" (ID: 12345) is monitored
- User "Sofia Romano" (ID: 210340) is monitored
- Sofia joins a table at Trattoria da Mario

**Result:**
1. Restaurant monitoring sends: "Participant joined table at Trattoria da Mario (🔔 Monitored User)"
2. User monitoring sends: "Sofia Romano joined a table at Trattoria da Mario"

### Shared Infrastructure

Both monitoring modes share:
- State file (`monitoring-state.json`)
- Notification services (Telegram and Console)
- API client and retry logic
- Configuration management
- Error handling and resilience

## Error Handling

### API Failures

**Behavior:**
- Failed API calls are automatically retried with exponential backoff
- If a restaurant query fails, the system logs the error and continues with other restaurants
- Monitoring continues even if some restaurants are temporarily unavailable

**Configuration:**
```bash
export MAX_RETRIES=3
export RETRY_DELAY_MS=1000
export RETRY_BACKOFF_MULTIPLIER=2
```

### File Errors

**Missing Restaurant File:**
- System creates a template file with instructions
- Continues with empty restaurant list
- Logs informational message

**Unreadable Restaurant File:**
- Logs error with details
- Continues with empty restaurant list
- Monitoring continues normally

**Invalid Restaurant IDs:**
- Invalid entries are skipped with warnings
- Valid entries are processed normally
- System continues monitoring

### State File Corruption

**Behavior:**
- If state file is corrupted or invalid JSON, system starts with fresh state
- Logs warning message
- Monitoring continues normally
- All tables will be detected as "new" on first scan

**Prevention:**
- Atomic file operations prevent corruption during writes
- Temporary file used during save, then renamed

### Notification Failures

**Behavior:**
- If Telegram notification fails, error is logged
- Console output continues normally
- Monitoring continues without interruption

## Troubleshooting

### No Notifications Received

**Check:**
1. Verify `monitored-restaurants.txt` exists and contains valid IDs
2. Ensure restaurant IDs are not commented out
3. Check that restaurants have table activity during monitoring period
4. Review console logs for parsing errors or API failures
5. Verify Telegram configuration (if using Telegram notifications)

**Debug:**
```bash
# Enable detailed logging
export LOGGING_ENABLED=true

# Check file parsing
cat monitored-restaurants.txt

# Verify API access
curl -H "X-AUTH-TOKEN: your_token" \
  "https://api.tabloapp.com/tavoliService/getTavoliNewOrder?..."
```

### Duplicate Notifications

**Expected Behavior:**
- When a table involves both a monitored restaurant and a monitored user, you'll receive notifications from both systems
- This is intentional and provides different perspectives

**If Unwanted:**
- Remove restaurant from `monitored-restaurants.txt`, OR
- Remove user from `monitored-users.txt`
- Keep only one monitoring mode active

### Missing Template File

**Solution:**
- The system automatically creates `monitored-restaurants.txt` if it doesn't exist
- Edit the template and add your restaurant IDs
- Restart monitoring or wait for next scan

### Invalid Restaurant IDs

**Symptoms:**
- Console warnings about invalid entries
- Restaurants not being monitored

**Solution:**
1. Check console logs for specific error messages
2. Verify restaurant IDs are non-empty strings
3. Remove special characters or extra whitespace
4. Ensure one ID per line
5. Check that IDs are valid Tablo restaurant IDs

### State File Issues

**Symptoms:**
- All tables detected as "new" on every scan
- Duplicate notifications for same events

**Solution:**
1. Check `monitoring-state.json` exists and is readable
2. Verify JSON is valid (use a JSON validator)
3. Check file permissions
4. If corrupted, delete file and let system create fresh state

**Manual Reset:**
```bash
# Backup current state
cp monitoring-state.json monitoring-state.json.backup

# Delete state file (system will create fresh state)
rm monitoring-state.json

# Restart monitoring
bun run src/index.ts watch-users
```

## Best Practices

### Restaurant Selection

**Choose restaurants that:**
- Have regular table activity
- Are relevant to your interests
- Have sufficient API data quality

**Avoid:**
- Monitoring too many restaurants (increases API load)
- Inactive or closed restaurants
- Restaurants with unreliable data

### File Management

**Do:**
- Use comments to document why each restaurant is monitored
- Keep the file organized and readable
- Use inline comments for temporary notes
- Commit the file to version control (if appropriate)

**Don't:**
- Leave invalid IDs in the file
- Use special characters in comments
- Create extremely long files (performance impact)

### Monitoring Strategy

**Recommended:**
- Start with a small number of restaurants (3-5)
- Monitor restaurants with regular activity
- Use both user and restaurant monitoring for comprehensive coverage
- Review notifications regularly and adjust restaurant list

**Advanced:**
- Use different restaurant files for different purposes
- Rotate monitored restaurants based on season or events
- Combine with user monitoring for specific scenarios

### Performance Optimization

**For many restaurants:**
- Increase scan interval to reduce API load
- Monitor fewer days ahead
- Use grace period to reduce false notifications
- Consider splitting into multiple monitoring instances

**Configuration:**
```bash
export INTERVAL_SECONDS=600  # 10 minutes instead of 5
export DAYS_TO_SCAN=2        # 2 days instead of 3
export GRACE_PERIOD_SCANS=5  # More tolerance for API issues
```

## Advanced Usage

### Multiple Restaurant Files

Use different files for different purposes:

```bash
# Monitor favorite restaurants
bun run src/index.ts watch-users \
  --restaurant-ids-file favorites.txt

# Monitor new restaurants to explore
bun run src/index.ts watch-users \
  --restaurant-ids-file explore.txt
```

### Programmatic Restaurant Management

Update restaurant list programmatically:

```bash
# Add a restaurant
echo "12345  # New restaurant" >> monitored-restaurants.txt

# Remove a restaurant (comment it out)
sed -i 's/^12345/# 12345/' monitored-restaurants.txt
```

### Integration with Other Tools

**Export notifications to other systems:**
- Parse console output
- Forward Telegram messages
- Use webhooks (requires custom implementation)

**Automated restaurant discovery:**
- Use the `users` command to find active restaurants
- Analyze table data to identify popular venues
- Add promising restaurants to monitoring list

## Examples

### Example 1: Monitor Favorite Restaurants

```bash
# Create restaurant list
cat > monitored-restaurants.txt << EOF
12345  # Trattoria da Mario - best pasta
67890  # Osteria del Borgo - great atmosphere
54321  # Pizzeria Napoli - authentic pizza
EOF

# Start monitoring
export TABLO_AUTH_TOKEN="your_token"
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"

bun run src/index.ts watch-users --restaurant-ids-file monitored-restaurants.txt
```

### Example 2: Combined User and Restaurant Monitoring

```bash
# Monitor specific users
cat > monitored-users.txt << EOF
210340
642315
EOF

# Monitor specific restaurants
cat > monitored-restaurants.txt << EOF
12345
67890
EOF

# Start both monitors
bun run src/index.ts watch-users \
  --user-ids-file monitored-users.txt \
  --restaurant-ids-file monitored-restaurants.txt
```

### Example 3: Temporary Restaurant Monitoring

```bash
# Monitor a restaurant for one evening
echo "12345  # Special event tonight" > temp-restaurants.txt

# Run with custom scan interval (every 2 minutes)
export INTERVAL_SECONDS=120
bun run src/index.ts watch-users --restaurant-ids-file temp-restaurants.txt

# Stop monitoring after event (Ctrl+C)
# Clean up
rm temp-restaurants.txt
```

## Summary

Restaurant monitoring provides comprehensive tracking of table activity within specific venues on the Tablo platform. It complements user monitoring by offering a restaurant-centric perspective, enabling you to stay informed about all dining activity at your favorite locations.

**Key Benefits:**
- Track all tables at specific restaurants
- Monitor participant changes in real-time
- Receive notifications for new tables and cancellations
- Cross-reference with monitored users
- Flexible configuration and error handling

**Getting Started:**
1. Create `monitored-restaurants.txt` with restaurant IDs
2. Configure environment variables (auth token, Telegram)
3. Run `bun run src/index.ts watch-users`
4. Review notifications and adjust restaurant list as needed

For more information, see the main README.md and USER_MONITORING.md documentation.
