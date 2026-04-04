# 📊 TabloCrawler Monitoring & Maintenance

Interactive monitoring and maintenance guide for TabloCrawler operations.

## Health Monitoring

### System Health Checks

```bash {"id":"health-overview","name":"system-health-overview"}
# Comprehensive system health overview
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== System Overview ==='
  uptime
  echo '=== Memory Usage ==='
  free -h
  echo '=== Disk Usage ==='
  df -h
  echo '=== CPU Temperature ==='
  vcgencmd measure_temp 2>/dev/null || echo 'Temperature monitoring not available'
"
```

### Container Health Monitoring

```bash {"id":"container-health","name":"container-health-status"}
# Monitor Docker container health
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Container Status ==='
  docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
  echo '=== Container Resource Usage ==='
  docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}'
"
```

### Application Health Verification

```bash {"id":"app-health","name":"application-health-check"}
# Verify TabloCrawler application health
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Application Process Check ==='
  docker exec tabloCrawler ps aux
  echo '=== API Connectivity Test ==='
  docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1 | head -5
"
```

### Automated Health Monitoring

```bash {"id":"monitor-continuous","interactive":"true","name":"continuous-health-monitoring"}
# Continuous health monitoring with alerts
echo "Starting continuous health monitoring..."
while true; do
  echo "=== $(date) ==="

  # Check container status
  if ssh ${SSH_USER:-pi}@${SSH_HOST} "docker ps | grep -q tabloCrawler"; then
    echo "✓ Container running"
  else
    echo "✗ Container not running - ALERT!"
  fi

  # Check memory usage
  MEM_USAGE=$(ssh ${SSH_USER:-pi}@${SSH_HOST} "free | grep Mem | awk '{printf \"%.0f\", \$3/\$2 * 100.0}'")
  if [ "$MEM_USAGE" -gt 80 ]; then
    echo "⚠️  High memory usage: ${MEM_USAGE}%"
  else
    echo "✓ Memory usage: ${MEM_USAGE}%"
  fi

  sleep ${HEALTH_CHECK_INTERVAL:-60}
done
```

## Log Management

### Real-Time Log Viewing

```bash {"id":"logs-realtime","name":"view-realtime-logs"}
# View real-time application logs
ssh ${SSH_USER:-pi}@${SSH_HOST} "docker logs -f tabloCrawler"
```

```bash {"id":"logs-filtered","interactive":"true","name":"view-filtered-logs"}
# View filtered logs by pattern
read -p "Enter log filter pattern: " pattern
ssh ${SSH_USER:-pi}@${SSH_HOST} "docker logs tabloCrawler 2>&1 | grep -i '${pattern}'"
```

### Log Analysis

```bash {"id":"analyze-logs","name":"analyze-application-logs"}
# Analyze recent logs for patterns
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Recent Error Patterns ==='
  docker logs --since 1h tabloCrawler 2>&1 | grep -i error | tail -10

  echo '=== API Call Statistics ==='
  docker logs --since 1h tabloCrawler 2>&1 | grep -c 'API call' || echo 'No API calls found'

  echo '=== Table Scan Results ==='
  docker logs --since 1h tabloCrawler 2>&1 | grep -i 'balanced table' | tail -5
"
```

### Log Collection and Archival

```bash {"id":"collect-logs","interactive":"true","name":"collect-and-archive-logs"}
# Collect logs for analysis or support
LOG_DATE=$(date +%Y%m%d_%H%M%S)
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  mkdir -p /tmp/logs/${LOG_DATE}

  # Application logs
  docker logs tabloCrawler > /tmp/logs/${LOG_DATE}/application.log 2>&1

  # System logs
  journalctl --since '1 day ago' > /tmp/logs/${LOG_DATE}/system.log

  # Docker logs
  docker system events --since 24h > /tmp/logs/${LOG_DATE}/docker.log 2>&1 &
  sleep 2
  kill %1 2>/dev/null

  # Create archive
  tar -czf /tmp/tabloCrawler_logs_${LOG_DATE}.tar.gz /tmp/logs/${LOG_DATE}
  echo 'Logs archived to: /tmp/tabloCrawler_logs_${LOG_DATE}.tar.gz'
"
```

### Log Rotation and Cleanup

```bash {"id":"rotate-logs","name":"rotate-and-cleanup-logs"}
# Rotate and clean up old logs
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Current Log Sizes ==='
  docker exec tabloCrawler du -sh /var/log/* 2>/dev/null || echo 'No log directory found'

  echo '=== Rotating Docker Logs ==='
  docker logs tabloCrawler > /tmp/tabloCrawler_$(date +%Y%m%d).log 2>&1

  echo '=== Cleaning Old Logs ==='
  find /tmp -name 'tabloCrawler_*.log' -mtime +7 -delete

  echo '=== Docker System Cleanup ==='
  docker system prune -f --filter 'until=24h'
"
```

## Performance Monitoring

### Resource Usage Monitoring

```bash {"id":"monitor-resources","name":"monitor-system-resources"}
# Monitor system resource usage
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== CPU Usage ==='
  top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1

  echo '=== Memory Details ==='
  cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Buffers|Cached'

  echo '=== Disk I/O ==='
  iostat -x 1 1 2>/dev/null || echo 'iostat not available'

  echo '=== Network Usage ==='
  cat /proc/net/dev | grep -E 'eth0|wlan0'
"
```

### Application Performance Metrics

```bash {"id":"monitor-app-performance","name":"monitor-application-performance"}
# Monitor application-specific performance
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Container Resource Usage ==='
  docker stats --no-stream tabloCrawler

  echo '=== Process Tree ==='
  docker exec tabloCrawler ps auxf

  echo '=== Memory Map ==='
  docker exec tabloCrawler cat /proc/1/status | grep -E 'VmSize|VmRSS|VmData'
"
```

### API Performance Testing

```bash {"id":"test-api-performance","interactive":"true","name":"test-api-performance"}
# Test API response times and performance
echo "Testing API performance..."
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== API Response Time Test ==='
  time docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1

  echo '=== Multiple API Calls Test ==='
  for i in {1..5}; do
    echo \"Call \$i:\"
    time docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1 >/dev/null
  done
"
```

### Performance Optimization

```bash {"id":"optimize-performance","name":"optimize-system-performance"}
# Optimize system performance
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Memory Optimization ==='
  sync
  echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo 'Cache drop requires sudo'

  echo '=== Docker Optimization ==='
  docker system prune -f

  echo '=== System Optimization ==='
  sudo apt autoremove -y 2>/dev/null || echo 'Package cleanup requires sudo'
"
```

## Alerting and Notifications

### Setup Monitoring Alerts

```bash {"id":"setup-alerts","interactive":"true","name":"setup-monitoring-alerts"}
# Setup basic monitoring with Telegram alerts
cat > /tmp/monitor_script.sh << 'EOF'
#!/bin/bash
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}"

send_alert() {
  local message="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=🚨 TabloCrawler Alert: $message"
  fi
  echo "ALERT: $message"
}

# Check container status
if ! docker ps | grep -q tabloCrawler; then
  send_alert "Container is not running"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEM_USAGE" -gt 90 ]; then
  send_alert "High memory usage: ${MEM_USAGE}%"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
  send_alert "High disk usage: ${DISK_USAGE}%"
fi
EOF

scp /tmp/monitor_script.sh ${SSH_USER:-pi}@${SSH_HOST}:/tmp/
ssh ${SSH_USER:-pi}@${SSH_HOST} "chmod +x /tmp/monitor_script.sh && /tmp/monitor_script.sh"
```

### Test Alert System

```bash {"id":"test-alerts","name":"test-alert-system"}
# Test alert notification system
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=✅ TabloCrawler monitoring test - system operational"
  echo "Test alert sent via Telegram"
else
  echo "⚠️  Telegram not configured - alerts will only appear in logs"
fi
```

## Maintenance Operations

### Regular Maintenance Tasks

```bash {"id":"maintenance-routine","name":"routine-maintenance"}
# Perform routine maintenance tasks
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== System Updates ==='
  sudo apt update && sudo apt list --upgradable

  echo '=== Docker Maintenance ==='
  docker system df
  docker system prune -f --volumes

  echo '=== Log Cleanup ==='
  journalctl --vacuum-time=7d

  echo '=== Restart Services ==='
  docker restart tabloCrawler

  echo 'Routine maintenance completed'
"
```

### Database/State Cleanup

```bash {"id":"cleanup-state","name":"cleanup-application-state"}
# Clean up application state and temporary files
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Application State Cleanup ==='
  docker exec tabloCrawler find /tmp -type f -mtime +1 -delete 2>/dev/null || echo 'No temp files to clean'

  echo '=== Monitoring State Reset ==='
  docker exec tabloCrawler rm -f monitoring-state.json.tmp

  echo 'Application state cleanup completed'
"
```

### Security Updates

```bash {"id":"security-updates","interactive":"true","name":"apply-security-updates"}
# Apply security updates
echo "⚠️  Applying security updates - this may restart services"
read -p "Continue? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  ssh ${SSH_USER:-pi}@${SSH_HOST} "
    sudo apt update
    sudo apt upgrade -y
    sudo apt autoremove -y

    # Update Docker if needed
    docker --version

    # Restart container with latest security patches
    docker pull ghcr.io/your-org/tabloCrawler:latest
    docker restart tabloCrawler
  "
else
  echo "Security updates cancelled"
fi
```

## Backup and Recovery

### Automated Backup

```bash {"id":"backup-automated","name":"automated-backup"}
# Create automated backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Creating Backup ==='
  mkdir -p /backup/${BACKUP_DATE}

  # Backup configuration
  cp -r /opt/tabloCrawler /backup/${BACKUP_DATE}/

  # Backup application state
  docker exec tabloCrawler cp monitoring-state.json /tmp/monitoring-state-backup.json 2>/dev/null || echo 'No state file to backup'

  # Create archive
  tar -czf /backup/tabloCrawler_${BACKUP_DATE}.tar.gz /backup/${BACKUP_DATE}

  echo 'Backup created: /backup/tabloCrawler_${BACKUP_DATE}.tar.gz'
"
```

### Backup Verification

```bash {"id":"verify-backup","name":"verify-backup-integrity"}
# Verify backup integrity
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Backup Verification ==='
  ls -la /backup/*.tar.gz | tail -5

  # Test latest backup
  LATEST_BACKUP=\$(ls -t /backup/*.tar.gz | head -1)
  if [ -n \"\$LATEST_BACKUP\" ]; then
    echo \"Testing backup: \$LATEST_BACKUP\"
    tar -tzf \"\$LATEST_BACKUP\" | head -10
    echo 'Backup verification completed'
  else
    echo 'No backups found'
  fi
"
```

## Troubleshooting Tools

### System Diagnostics

```bash {"id":"diagnose-system","name":"comprehensive-system-diagnostics"}
# Comprehensive system diagnostics
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== System Information ==='
  uname -a
  cat /etc/os-release

  echo '=== Hardware Information ==='
  lscpu | grep -E 'Model name|CPU\(s\)|Architecture'
  cat /proc/meminfo | grep MemTotal

  echo '=== Network Configuration ==='
  ip addr show | grep -E 'inet |UP'

  echo '=== Service Status ==='
  systemctl status docker --no-pager

  echo '=== Recent System Errors ==='
  journalctl --since '1 hour ago' --priority=err --no-pager | tail -10
"
```

### Application Diagnostics

```bash {"id":"diagnose-application","name":"application-diagnostics"}
# Application-specific diagnostics
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Container Diagnostics ==='
  docker inspect tabloCrawler | jq '.[] | {State, Config.Env, Mounts}'

  echo '=== Application Environment ==='
  docker exec tabloCrawler env | grep -E 'TABLO|TELEGRAM|NODE'

  echo '=== Application Files ==='
  docker exec tabloCrawler ls -la /app/

  echo '=== Recent Application Activity ==='
  docker logs --since 30m tabloCrawler | tail -20
"
```

### Network Diagnostics

```bash {"id":"diagnose-network","name":"network-diagnostics"}
# Network connectivity diagnostics
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== External Connectivity ==='
  ping -c 3 8.8.8.8

  echo '=== API Connectivity ==='
  curl -I https://api.tabloapp.com --max-time 10

  echo '=== DNS Resolution ==='
  nslookup api.tabloapp.com

  echo '=== Container Network ==='
  docker network ls
  docker exec tabloCrawler netstat -tuln 2>/dev/null || echo 'netstat not available in container'
"
```

## 📚 Related Documentation

- [Quick Start Guide](./runbook-quickstart.md)
- [Development Workflows](./runbook-development.md)
- [Deployment Operations](./runbook-deployment.md)
- [Emergency Procedures](./runbook-emergency.md)
