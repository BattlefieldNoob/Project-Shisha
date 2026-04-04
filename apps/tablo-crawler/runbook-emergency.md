# 🚨 TabloCrawler Emergency Procedures

Critical emergency procedures for TabloCrawler incident response, rollback, and recovery operations.

## 🚨 EMERGENCY QUICK ACTIONS

### Immediate Service Stop

```bash {"id":"emergency-stop","interactive":"true","name":"emergency-stop-all","category":"emergency"}
# EMERGENCY: Stop all TabloCrawler services immediately
echo "🚨 EMERGENCY STOP - Stopping all TabloCrawler services"
read -p "Confirm emergency stop (type 'EMERGENCY'): " confirm
if [ "$confirm" = "EMERGENCY" ]; then
  ssh ${SSH_USER:-pi}@${SSH_HOST} "
    docker stop tabloCrawler
    docker kill tabloCrawler 2>/dev/null || true
    echo 'Emergency stop completed'
  "
else
  echo "Emergency stop cancelled"
fi
```

### Emergency Service Restart

```bash {"id":"emergency-restart","interactive":"true","name":"emergency-restart","category":"emergency"}
# EMERGENCY: Restart TabloCrawler service
echo "🚨 EMERGENCY RESTART - Restarting TabloCrawler"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  docker restart tabloCrawler || docker start tabloCrawler
  sleep 5
  docker ps | grep tabloCrawler
  echo 'Emergency restart completed'
"
```

### Emergency Health Check

```bash {"id":"emergency-health","name":"emergency-health-check","category":"emergency"}
# EMERGENCY: Quick health assessment
echo "🚨 EMERGENCY HEALTH CHECK"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Container Status ==='
  docker ps -a | grep tabloCrawler

  echo '=== System Resources ==='
  free -h | head -2
  df -h / | tail -1

  echo '=== Recent Errors ==='
  docker logs --since 10m tabloCrawler 2>&1 | grep -i error | tail -5

  echo '=== System Load ==='
  uptime
"
```

## Incident Response Procedures

### Service Failure Response

```bash {"id":"respond-service-failure","name":"service-failure-response","category":"emergency"}
# Respond to service failure incident
echo "🚨 SERVICE FAILURE RESPONSE"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Checking Service Status ==='
  if docker ps | grep -q tabloCrawler; then
    echo '✓ Container is running'
    docker logs --tail 20 tabloCrawler
  else
    echo '✗ Container is not running - attempting restart'
    docker start tabloCrawler
    sleep 5
    if docker ps | grep -q tabloCrawler; then
      echo '✓ Container restarted successfully'
    else
      echo '✗ Container failed to restart - manual intervention required'
      docker logs tabloCrawler
    fi
  fi
"
```

### High Resource Usage Response

```bash {"id":"respond-high-resources","name":"high-resource-response","category":"emergency"}
# Respond to high resource usage
echo "🚨 HIGH RESOURCE USAGE RESPONSE"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Current Resource Usage ==='
  free -h
  df -h

  echo '=== Top Processes ==='
  ps aux --sort=-%cpu | head -10

  echo '=== Container Resources ==='
  docker stats --no-stream

  echo '=== Emergency Cleanup ==='
  docker system prune -f
  sync
  echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo 'Cache drop requires sudo'

  echo '=== Post-Cleanup Status ==='
  free -h
"
```

### API Connectivity Issues

```bash {"id":"respond-api-issues","name":"api-connectivity-response"}
# Respond to API connectivity issues
echo "🚨 API CONNECTIVITY ISSUE RESPONSE"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Network Connectivity Test ==='
  ping -c 3 api.tabloapp.com

  echo '=== DNS Resolution Test ==='
  nslookup api.tabloapp.com

  echo '=== API Endpoint Test ==='
  curl -I https://api.tabloapp.com --max-time 10

  echo '=== Container Network Test ==='
  docker exec tabloCrawler ping -c 3 api.tabloapp.com

  echo '=== Application API Test ==='
  docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1 | head -3
"
```

## Rollback Procedures

### Immediate Rollback to Previous Version

```bash {"id":"rollback-immediate","interactive":"true","name":"immediate-rollback","category":"emergency"}
# EMERGENCY: Immediate rollback to previous version
echo "🚨 IMMEDIATE ROLLBACK"
read -p "Enter previous image tag (or 'latest-stable'): " prev_tag
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo 'Stopping current container...'
  docker stop tabloCrawler

  echo 'Backing up current container...'
  docker rename tabloCrawler tabloCrawler_backup_\$(date +%Y%m%d_%H%M%S)

  echo 'Starting previous version...'
  docker run -d --name tabloCrawler \
    --env-file /opt/tabloCrawler/.env \
    --restart unless-stopped \
    ghcr.io/your-org/tabloCrawler:${prev_tag}

  sleep 5
  docker ps | grep tabloCrawler
  echo 'Rollback completed'
"
```

### Configuration Rollback

```bash {"id":"rollback-config","interactive":"true","name":"configuration-rollback","category":"emergency"}
# EMERGENCY: Rollback configuration changes
echo "🚨 CONFIGURATION ROLLBACK"
read -p "Enter backup date (YYYYMMDD_HHMMSS): " backup_date
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo 'Stopping services...'
  docker stop tabloCrawler

  echo 'Restoring configuration...'
  if [ -f /backup/tabloCrawler_${backup_date}.tar.gz ]; then
    sudo tar -xzf /backup/tabloCrawler_${backup_date}.tar.gz -C /
    echo 'Configuration restored from backup'
  else
    echo 'Backup not found - listing available backups:'
    ls -la /backup/*.tar.gz | tail -5
    exit 1
  fi

  echo 'Restarting services...'
  docker start tabloCrawler
  sleep 5
  docker ps | grep tabloCrawler
"
```

### Full System Rollback

```bash {"id":"rollback-full-system","interactive":"true","name":"full-system-rollback","category":"emergency"}
# EMERGENCY: Full system rollback using Ansible
echo "🚨 FULL SYSTEM ROLLBACK"
read -p "Enter rollback version: " rollback_version
read -p "Confirm full rollback (type 'ROLLBACK'): " confirm
if [ "$confirm" = "ROLLBACK" ]; then
  cd deploy
  ansible-playbook -i inventory.yml playbook.yml \
    --vault-password-file .vault_pass \
    --extra-vars "image_tag=${rollback_version} emergency_rollback=true"
else
  echo "Full rollback cancelled"
fi
```

## Recovery Procedures

### Service Recovery

```bash {"id":"recover-service","name":"service-recovery-procedure"}
# Complete service recovery procedure
echo "🔧 SERVICE RECOVERY PROCEDURE"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Step 1: Stop all services ==='
  docker stop tabloCrawler 2>/dev/null || true

  echo '=== Step 2: Clean up containers ==='
  docker rm tabloCrawler 2>/dev/null || true

  echo '=== Step 3: Pull latest image ==='
  docker pull ghcr.io/your-org/tabloCrawler:latest

  echo '=== Step 4: Start fresh container ==='
  docker run -d --name tabloCrawler \
    --env-file /opt/tabloCrawler/.env \
    --restart unless-stopped \
    ghcr.io/your-org/tabloCrawler:latest

  echo '=== Step 5: Verify recovery ==='
  sleep 10
  docker ps | grep tabloCrawler
  docker logs --tail 10 tabloCrawler
"
```

### Data Recovery

```bash {"id":"recover-data","interactive":"true","name":"data-recovery-procedure"}
# Data recovery from backup
echo "🔧 DATA RECOVERY PROCEDURE"
read -p "Enter backup date for recovery: " recovery_date
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Stopping services for data recovery ==='
  docker stop tabloCrawler

  echo '=== Recovering data from backup ==='
  if [ -f /backup/tabloCrawler_${recovery_date}.tar.gz ]; then
    # Extract to temporary location first
    mkdir -p /tmp/recovery_${recovery_date}
    tar -xzf /backup/tabloCrawler_${recovery_date}.tar.gz -C /tmp/recovery_${recovery_date}

    # Restore specific data files
    cp /tmp/recovery_${recovery_date}/backup/*/opt/tabloCrawler/monitoring-state.json /opt/tabloCrawler/ 2>/dev/null || echo 'No state file to recover'

    echo 'Data recovery completed'
  else
    echo 'Recovery backup not found'
    ls -la /backup/*.tar.gz | tail -5
  fi

  echo '=== Restarting services ==='
  docker start tabloCrawler
"
```

### Network Recovery

```bash {"id":"recover-network","name":"network-recovery-procedure"}
# Network connectivity recovery
echo "🔧 NETWORK RECOVERY PROCEDURE"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Step 1: Restart network services ==='
  sudo systemctl restart networking 2>/dev/null || echo 'Network restart requires sudo'

  echo '=== Step 2: Restart Docker networking ==='
  sudo systemctl restart docker

  echo '=== Step 3: Recreate container with fresh network ==='
  docker stop tabloCrawler
  docker rm tabloCrawler
  docker run -d --name tabloCrawler \
    --env-file /opt/tabloCrawler/.env \
    --restart unless-stopped \
    ghcr.io/your-org/tabloCrawler:latest

  echo '=== Step 4: Verify network connectivity ==='
  sleep 5
  docker exec tabloCrawler ping -c 3 api.tabloapp.com
"
```

## Disaster Recovery

### Complete System Rebuild

```bash {"id":"disaster-rebuild","interactive":"true","name":"complete-system-rebuild","category":"emergency"}
# DISASTER RECOVERY: Complete system rebuild
echo "🚨 DISASTER RECOVERY - COMPLETE SYSTEM REBUILD"
read -p "This will rebuild the entire system. Type 'DISASTER' to confirm: " confirm
if [ "$confirm" = "DISASTER" ]; then
  echo "Starting disaster recovery procedure..."

  # Use Ansible for complete rebuild
  cd deploy
  ansible-playbook -i inventory.yml playbook.yml \
    --vault-password-file .vault_pass \
    --extra-vars "disaster_recovery=true force_rebuild=true"

  echo "Disaster recovery deployment completed"
else
  echo "Disaster recovery cancelled"
fi
```

### Emergency Backup Creation

```bash {"id":"emergency-backup","name":"emergency-backup-creation","category":"emergency"}
# EMERGENCY: Create immediate backup before recovery
echo "🚨 EMERGENCY BACKUP CREATION"
EMERGENCY_DATE=$(date +%Y%m%d_%H%M%S)
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo 'Creating emergency backup...'
  mkdir -p /backup/emergency_${EMERGENCY_DATE}

  # Backup current state
  docker exec tabloCrawler cp -r /app /backup/emergency_${EMERGENCY_DATE}/ 2>/dev/null || echo 'App directory not accessible'
  cp -r /opt/tabloCrawler /backup/emergency_${EMERGENCY_DATE}/

  # Backup logs
  docker logs tabloCrawler > /backup/emergency_${EMERGENCY_DATE}/container.log 2>&1
  journalctl --since '1 hour ago' > /backup/emergency_${EMERGENCY_DATE}/system.log

  # Create archive
  tar -czf /backup/emergency_backup_${EMERGENCY_DATE}.tar.gz /backup/emergency_${EMERGENCY_DATE}

  echo 'Emergency backup created: /backup/emergency_backup_${EMERGENCY_DATE}.tar.gz'
"
```

## Escalation Procedures

### Collect Diagnostic Information

```bash {"id":"collect-diagnostics","name":"collect-emergency-diagnostics"}
# Collect comprehensive diagnostic information for escalation
echo "📋 COLLECTING DIAGNOSTIC INFORMATION"
DIAG_DATE=$(date +%Y%m%d_%H%M%S)
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  mkdir -p /tmp/diagnostics_${DIAG_DATE}

  echo '=== System Information ==='
  uname -a > /tmp/diagnostics_${DIAG_DATE}/system_info.txt
  cat /etc/os-release >> /tmp/diagnostics_${DIAG_DATE}/system_info.txt

  echo '=== Container Information ==='
  docker ps -a > /tmp/diagnostics_${DIAG_DATE}/containers.txt
  docker inspect tabloCrawler > /tmp/diagnostics_${DIAG_DATE}/container_inspect.json 2>/dev/null || echo 'Container not found'

  echo '=== Logs ==='
  docker logs tabloCrawler > /tmp/diagnostics_${DIAG_DATE}/application.log 2>&1
  journalctl --since '2 hours ago' > /tmp/diagnostics_${DIAG_DATE}/system.log

  echo '=== Resource Usage ==='
  free -h > /tmp/diagnostics_${DIAG_DATE}/memory.txt
  df -h > /tmp/diagnostics_${DIAG_DATE}/disk.txt
  ps aux > /tmp/diagnostics_${DIAG_DATE}/processes.txt

  echo '=== Network ==='
  ip addr > /tmp/diagnostics_${DIAG_DATE}/network.txt
  netstat -tuln > /tmp/diagnostics_${DIAG_DATE}/ports.txt 2>/dev/null || ss -tuln > /tmp/diagnostics_${DIAG_DATE}/ports.txt

  # Create diagnostic archive
  tar -czf /tmp/emergency_diagnostics_${DIAG_DATE}.tar.gz /tmp/diagnostics_${DIAG_DATE}

  echo 'Diagnostics collected: /tmp/emergency_diagnostics_${DIAG_DATE}.tar.gz'
"
```

### Send Emergency Alert

```bash {"id":"send-emergency-alert","interactive":"true","name":"send-emergency-alert"}
# Send emergency alert notification
read -p "Enter incident description: " incident_desc
echo "📢 SENDING EMERGENCY ALERT"

# Send Telegram alert if configured
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=🚨 EMERGENCY ALERT 🚨%0A%0AIncident: ${incident_desc}%0ATime: $(date)%0ASystem: TabloCrawler%0A%0AImmediate attention required!"
  echo "Emergency alert sent via Telegram"
else
  echo "⚠️  Telegram not configured - manual notification required"
fi

echo "Emergency alert logged: ${incident_desc} at $(date)"
```

## Post-Incident Procedures

### Incident Documentation

```bash {"id":"document-incident","interactive":"true","name":"document-incident"}
# Document incident for post-mortem
read -p "Enter incident ID: " incident_id
read -p "Enter brief incident description: " incident_summary

cat > /tmp/incident_${incident_id}.md << EOF
# Incident Report: ${incident_id}

## Summary
${incident_summary}

## Timeline
- **Incident Start**: $(date)
- **Detection**: Manual/Automated
- **Response Started**: $(date)
- **Resolution**: TBD

## Impact
- Service Availability: TBD
- Data Integrity: TBD
- User Impact: TBD

## Root Cause
TBD - Requires investigation

## Actions Taken
- Emergency procedures executed
- Diagnostics collected
- System status verified

## Follow-up Actions
- [ ] Root cause analysis
- [ ] System improvements
- [ ] Documentation updates
- [ ] Process improvements

## Lessons Learned
TBD

---
Generated by TabloCrawler Emergency Runbook
EOF

echo "Incident documentation created: /tmp/incident_${incident_id}.md"
```

### System Validation Post-Recovery

```bash {"id":"validate-post-recovery","name":"post-recovery-validation"}
# Comprehensive validation after recovery
echo "✅ POST-RECOVERY VALIDATION"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Container Health ==='
  docker ps | grep tabloCrawler && echo '✓ Container running' || echo '✗ Container not running'

  echo '=== Application Functionality ==='
  docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1 | head -3 && echo '✓ API connectivity working' || echo '✗ API connectivity failed'

  echo '=== System Resources ==='
  free -h | grep Mem
  df -h / | tail -1

  echo '=== Recent Logs ==='
  docker logs --since 5m tabloCrawler | tail -5

  echo '=== Validation Complete ==='
  echo 'System recovery validation completed at $(date)'
"
```

## 📚 Emergency Contacts & Resources

### Quick Reference

- **Emergency Stop**: `docker stop tabloCrawler`
- **Emergency Restart**: `docker restart tabloCrawler`
- **View Logs**: `docker logs tabloCrawler`
- **System Status**: `docker ps && free -h && df -h`

### Related Documentation

- [Quick Start Guide](./runbook-quickstart.md)
- [Development Workflows](./runbook-development.md)
- [Deployment Operations](./runbook-deployment.md)
- [Monitoring Guide](./runbook-monitoring.md)

### Escalation Checklist

1. ✅ Emergency procedures executed
2. ✅ Diagnostics collected
3. ✅ Incident documented
4. ✅ Stakeholders notified
5. ✅ System status verified
