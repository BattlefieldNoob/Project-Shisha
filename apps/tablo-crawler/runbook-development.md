# 🔧 TabloCrawler Development Workflows

Interactive development guide for TabloCrawler local development, testing, and debugging.

## Environment Setup

### Initial Project Setup

```bash {"id":"clone-setup","name":"clone-and-setup"}
# Clone repository (if not already done)
# git clone <repository-url>
# cd tabloCrawler

# Install dependencies
bun install

# Copy environment template
cp runbook.env.example runbook.env
```

### Environment Configuration

```bash {"id":"configure-env","interactive":"true","name":"configure-environment"}
# Edit environment variables
${EDITOR:-code} runbook.env

# Load environment variables
source runbook.env

# Verify required variables are set
echo "TABLO_AUTH_TOKEN: ${TABLO_AUTH_TOKEN:0:10}..."
echo "Environment configured successfully"
```

### Dependency Verification

```bash {"id":"verify-deps","name":"verify-dependencies"}
# Check Bun version
bun --version

# Verify TypeScript compilation
bun run build 2>/dev/null || echo "Build check complete"

# List installed packages
bun pm ls
```

## Local Execution

### Table Scanning Commands

```bash {"id":"scan-basic","name":"basic-table-scan"}
# Basic table scan with default settings
bun run scan
```

```bash {"id":"scan-custom","interactive":"true","name":"custom-table-scan"}
# Custom table scan with parameters
bun run scan \
  --days ${DAYS_TO_SCAN:-3} \
  --min-participants ${MIN_PARTICIPANTS:-2} \
  --max-distance ${MAX_DISTANCE:-10.0}
```

```bash {"id":"scan-watch","interactive":"true","name":"watch-mode-scan"}
# Continuous scanning in watch mode
bun run src/index.ts scan \
  --days ${DAYS_TO_SCAN:-3} \
  --interval ${INTERVAL_SECONDS:-300} \
  --watch
```

### User Management Commands

```bash {"id":"list-users","interactive":"true","name":"list-restaurant-users"}
# List users for a specific restaurant
bun run users \
  --id-ristorante ${RESTAURANT_ID} \
  --min-partecipazioni ${MIN_PARTICIPANTS:-2}
```

```bash {"id":"user-stats","interactive":"true","name":"user-statistics"}
# Get detailed user statistics
bun run src/index.ts users \
  --id-ristorante ${RESTAURANT_ID} \
  --min-partecipazioni 1 \
  --verbose
```

### Direct CLI Execution

```bash {"id":"cli-help","name":"cli-help"}
# Show available commands and options
bun run src/index.ts --help
bun run src/index.ts scan --help
bun run src/index.ts users --help
```

```bash {"id":"cli-direct","interactive":"true","name":"direct-cli-execution"}
# Direct execution with custom parameters
bun run src/index.ts scan \
  --days ${DAYS_TO_SCAN:-3} \
  --min-participants ${MIN_PARTICIPANTS:-2} \
  --max-distance ${MAX_DISTANCE:-10.0} \
  --telegram-notifications ${ENABLE_TELEGRAM:-false}
```

## Testing & Validation

### API Connectivity Tests

```bash {"id":"test-api","interactive":"true","name":"test-api-connectivity"}
# Test Tablo API connectivity
echo "Testing API connectivity..."
bun run src/index.ts users --id-ristorante ${TEST_RESTAURANT_ID:-12345} --min-partecipazioni 1
```

```bash {"id":"test-endpoints","name":"test-api-endpoints"}
# Test different API endpoints
echo "Testing table endpoint..."
curl -H "X-AUTH-TOKEN: ${TABLO_AUTH_TOKEN}" \
  "https://api.tabloapp.com/tavoliService/getTavoliNewOrder?giorni=1" | jq '.[0:2]'
```

### Configuration Validation

```bash {"id":"validate-config","name":"validate-configuration"}
# Validate environment configuration
echo "Checking required environment variables..."
[ -n "$TABLO_AUTH_TOKEN" ] && echo "✓ TABLO_AUTH_TOKEN set" || echo "✗ TABLO_AUTH_TOKEN missing"
[ -n "$DAYS_TO_SCAN" ] && echo "✓ DAYS_TO_SCAN: $DAYS_TO_SCAN" || echo "✓ DAYS_TO_SCAN: default"
[ -n "$MIN_PARTICIPANTS" ] && echo "✓ MIN_PARTICIPANTS: $MIN_PARTICIPANTS" || echo "✓ MIN_PARTICIPANTS: default"
```

```bash {"id":"validate-telegram","interactive":"true","name":"validate-telegram"}
# Test Telegram integration (if configured)
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  echo "Testing Telegram notification..."
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=TabloCrawler test message from runbook"
else
  echo "Telegram not configured - skipping test"
fi
```

### Manual Testing Procedures

```bash {"id":"test-filters","interactive":"true","name":"test-filtering-logic"}
# Test gender balance filtering with known data
echo "Testing gender balance filtering..."
bun run src/index.ts scan --days 1 --min-participants 2 --dry-run
```

```bash {"id":"test-distance","interactive":"true","name":"test-distance-filtering"}
# Test distance filtering
echo "Testing distance filtering..."
bun run src/index.ts scan --days 1 --max-distance 5.0 --verbose
```

## Debugging

### Log Analysis

```bash {"id":"debug-logs","name":"debug-logging"}
# Enable debug logging
export DEBUG=tabloCrawler:*
bun run src/index.ts scan --days 1
```

```bash {"id":"verbose-output","name":"verbose-execution"}
# Run with verbose output
bun run src/index.ts scan --verbose --days 1
```

### Error Diagnosis

```bash {"id":"diagnose-auth","name":"diagnose-authentication"}
# Diagnose authentication issues
echo "Testing authentication..."
curl -H "X-AUTH-TOKEN: ${TABLO_AUTH_TOKEN}" \
  "https://api.tabloapp.com/tavoliService/getTavoliNewOrder?giorni=1" \
  -w "HTTP Status: %{http_code}\n" -o /dev/null -s
```

```bash {"id":"diagnose-network","name":"diagnose-network"}
# Diagnose network connectivity
echo "Testing network connectivity..."
ping -c 3 api.tabloapp.com
nslookup api.tabloapp.com
```

### Performance Monitoring

```bash {"id":"monitor-performance","name":"monitor-performance"}
# Monitor application performance
echo "Monitoring performance..."
time bun run src/index.ts scan --days 1
```

```bash {"id":"memory-usage","name":"monitor-memory"}
# Monitor memory usage during execution
echo "Starting memory monitoring..."
bun run src/index.ts scan --days 3 &
PID=$!
while kill -0 $PID 2>/dev/null; do
  ps -p $PID -o pid,vsz,rss,pcpu,pmem,comm
  sleep 5
done
```

## Development Tools

### Code Quality

```bash {"id":"type-check","name":"typescript-check"}
# TypeScript type checking
bun run tsc --noEmit
```

```bash {"id":"lint-code","name":"lint-code"}
# Code linting (if configured)
# bun run lint
echo "Linting not configured - add ESLint/Prettier if needed"
```

### Build and Package

```bash {"id":"build-app","name":"build-application"}
# Build application
bun build src/index.ts --outdir dist --target bun
```

```bash {"id":"package-info","name":"package-information"}
# Show package information
cat package.json | jq '{name, version, scripts, dependencies}'
```

### Development Server

```bash {"id":"dev-watch","name":"development-watch"}
# Development with file watching
bun --watch src/index.ts scan --days 1
```

## Troubleshooting

### Common Issues

```bash {"id":"fix-permissions","name":"fix-file-permissions"}
# Fix file permissions
chmod +x src/index.ts
chmod 600 runbook.env
```

```bash {"id":"clear-cache","name":"clear-bun-cache"}
# Clear Bun cache
bun pm cache rm
```

```bash {"id":"reinstall-deps","name":"reinstall-dependencies"}
# Reinstall dependencies
rm -rf node_modules bun.lock
bun install
```

### Environment Reset

```bash {"id":"reset-env","name":"reset-environment"}
# Reset environment configuration
cp runbook.env.example runbook.env
echo "Environment reset - please reconfigure runbook.env"
```

## 📚 Related Documentation

- [Quick Start Guide](./runbook-quickstart.md)
- [Deployment Workflows](./runbook-deployment.md)
- [Monitoring Guide](./runbook-monitoring.md)
- [Emergency Procedures](./runbook-emergency.md)