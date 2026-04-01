# TabloCrawler Operations Runbook

> **Interactive Version Available**: This runbook is also available as interactive Runme notebooks. Install the [Runme VS Code extension](https://marketplace.visualstudio.com/items?itemName=stateful.runme) for the best experience with parameter prompting and execution tracking.

## Table of Contents

- [Quick Start](#quick-start)
  - [Development Quick Start](#development-quick-start)
  - [Deployment Quick Start](#deployment-quick-start)
  - [Emergency Quick Reference](#emergency-quick-reference)
- [Development Workflows](#development-workflows)
  - [Environment Setup](#environment-setup)
  - [Local Execution](#local-execution)
  - [Testing & Validation](#testing--validation)
  - [Debugging](#debugging)
- [Deployment Operations](#deployment-operations)
  - [Prerequisites](#prerequisites)
  - [Core Deployment Workflows](#core-deployment-workflows)
  - [Ansible Vault Management](#ansible-vault-management)
  - [Environment-Specific Deployments](#environment-specific-deployments)
- [Monitoring & Maintenance](#monitoring--maintenance)
  - [Health Monitoring](#health-monitoring)
  - [Log Management](#log-management)
  - [Performance Monitoring](#performance-monitoring)
  - [Maintenance Operations](#maintenance-operations)
- [Emergency Procedures](#emergency-procedures)
  - [Emergency Quick Actions](#emergency-quick-actions)
  - [Incident Response](#incident-response)
  - [Rollback Procedures](#rollback-procedures)
  - [Recovery Procedures](#recovery-procedures)

---

## Quick Start

### Development Quick Start

#### 1. Environment Setup

```bash
# Copy the environment template
cp runbook.env.example runbook.env

# Edit the environment file with your settings
nano runbook.env  # or use your preferred editor
```

#### 2. Install Dependencies

```bash
# Install project dependencies
bun install
```

#### 3. Verify Configuration

```bash
# Load environment variables
source runbook.env

# Verify Tablo API connectivity
bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1
```

#### 4. Run Table Scanner

```bash
# Run the main table scanning functionality
bun run scan
```

#### 5. Monitor Users (Optional)

```bash
# Monitor users for a specific restaurant
bun run users -- --id-ristorante YOUR_RESTAURANT_ID --min-partecipazioni 2
```

### Deployment Quick Start

#### 1. SSH Key Setup

```bash
# Generate SSH key if you don't have one
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
fi

# Copy SSH key to Raspberry Pi
ssh-copy-id pi@YOUR_PI_IP
```

#### 2. Ansible Vault Setup

```bash
# Create vault password file
echo "YOUR_VAULT_PASSWORD" > deploy/.vault_pass
chmod 600 deploy/.vault_pass

# Verify vault access
ansible-vault view deploy/vault.yml --vault-password-file deploy/.vault_pass
```

#### 3. Deploy to Raspberry Pi

```bash
# Run full deployment
cd deploy
ansible-playbook -i inventory.yml playbook.yml --vault-password-file .vault_pass
```

### Emergency Quick Reference

#### Stop All Services

```bash
# Stop all TabloCrawler services immediately
cd deploy
ansible-playbook -i inventory.yml playbook.yml --tags stop --vault-password-file .vault_pass
```

#### View Live Logs

```bash
# View real-time logs from Raspberry Pi
ssh pi@YOUR_PI_IP "docker logs -f tabloCrawler"
```

#### Health Check

```bash
# Quick health check
cd deploy
ansible-playbook -i inventory.yml validate.yml --vault-password-file .vault_pass
```

---

## Development Workflows

### Environment Setup

#### Initial Project Setup

```bash
# Clone repository (if not already done)
# git clone <repository-url>
# cd tabloCrawler

# Install dependencies
bun install

# Copy environment template
cp runbook.env.example runbook.env
```

#### Environment Configuration

```bash
# Edit environment variables
nano runbook.env  # or code runbook.env

# Load environment variables
source runbook.env

# Verify required variables are set
echo "TABLO_AUTH_TOKEN: ${TABLO_AUTH_TOKEN:0:10}..."
echo "Environment configured successfully"
```

#### Dependency Verification

```bash
# Check Bun version
bun --version

# Verify TypeScript compilation
bun run build 2>/dev/null || echo "Build check complete"

# List installed packages
bun pm ls
```

### Local Execution

#### Table Scanning Commands

```bash
# Basic table scan with default settings
bun run scan

# Custom table scan with parameters
bun run scan --days 3 --min-participants 2 --max-distance 10.0

# Continuous scanning in watch mode
bun run src/index.ts scan --days 3 --interval 300 --watch
```

#### User Management Commands

```bash
# List users for a specific restaurant
bun run users --id-ristorante YOUR_RESTAURANT_ID --min-partecipazioni 2

# Get detailed user statistics
bun run src/index.ts users --id-ristorante YOUR_RESTAURANT_ID --min-partecipazioni 1 --verbose
```

#### Direct CLI Execution

```bash
# Show available commands and options
bun run src/index.ts --help
bun run src/index.ts scan --help
bun run src/index.ts users --help

# Direct execution with custom parameters
bun run src/index.ts scan --days 3 --min-participants 2 --max-distance 10.0 --telegram-notifications false
```

### Testing & Validation

#### API Connectivity Tests

```bash
# Test Tablo API connectivity
echo "Testing API connectivity..."
bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1

# Test different API endpoints
echo "Testing table endpoint..."
curl -H "X-AUTH-TOKEN: YOUR_TOKEN" \
  "https://api.tabloapp.com/tavoliService/getTavoliNewOrder?giorni=1" | jq '.[0:2]'
```

#### Configuration Validation

```bash
# Validate environment configuration
echo "Checking required environment variables..."
[ -n "$TABLO_AUTH_TOKEN" ] && echo "✓ TABLO_AUTH_TOKEN set" || echo "✗ TABLO_AUTH_TOKEN missing"
[ -n "$DAYS_TO_SCAN" ] && echo "✓ DAYS_TO_SCAN: $DAYS_TO_SCAN" || echo "✓ DAYS_TO_SCAN: default"
[ -n "$MIN_PARTICIPANTS" ] && echo "✓ MIN_PARTICIPANTS: $MIN_PARTICIPANTS" || echo "✓ MIN_PARTICIPANTS: default"
```

#### Telegram Integration Test

```bash
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

### Debugging

#### Log Analysis

```bash
# Enable debug logging
export DEBUG=tabloCrawler:*
bun run src/index.ts scan --days 1

# Run with verbose output
bun run src/index.ts scan --verbose --days 1
```

#### Error Diagnosis

```bash
# Diagnose authentication issues
echo "Testing authentication..."
curl -H "X-AUTH-TOKEN: ${TABLO_AUTH_TOKEN}" \
  "https://api.tabloapp.com/tavoliService/getTavoliNewOrder?giorni=1" \
  -w "HTTP Status: %{http_code}\n" -o /dev/null -s

# Diagnose network connectivity
echo "Testing network connectivity..."
ping -c 3 api.tabloapp.com
nslookup api.tabloapp.com
```

---

## Deployment Operations

### Prerequisites

#### SSH Configuration

```bash
# Generate SSH key pair if needed
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -C "tabloCrawler-deployment"
fi

# Copy SSH key to target Raspberry Pi
ssh-copy-id pi@YOUR_PI_IP

# Test SSH connectivity
ssh pi@YOUR_PI_IP "echo 'SSH connection successful'"
```

#### Ansible Vault Setup

```bash
# Create vault password file
echo "YOUR_VAULT_PASSWORD" > deploy/.vault_pass
chmod 600 deploy/.vault_pass

# Verify vault password works
ansible-vault view deploy/vault.yml --vault-password-file deploy/.vault_pass | head -5
```

#### Inventory Configuration

```bash
# Edit inventory file
nano deploy/inventory.yml

# Validate inventory
ansible-inventory -i deploy/inventory.yml --list
```

### Core Deployment Workflows

#### Full Initial Deployment

```bash
# Complete deployment with all components
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "target_host=raspberry_pi"
```

#### Configuration-Only Update

```bash
# Deploy only configuration changes
cd deploy
ansible-playbook -i inventory.yml config-only.yml \
  --vault-password-file .vault_pass \
  --extra-vars "target_host=raspberry_pi"
```

#### Application Update

```bash
# Update application image and restart services
cd deploy
ansible-playbook -i inventory.yml update.yml \
  --vault-password-file .vault_pass \
  --extra-vars "target_host=raspberry_pi"
```

#### Pull Latest Images

```bash
# Pull latest Docker images without restart
cd deploy
ansible-playbook -i inventory.yml pull.yml \
  --vault-password-file .vault_pass
```

### Ansible Vault Management

#### View Vault Contents

```bash
# View encrypted vault contents
cd deploy
ansible-vault view vault.yml --vault-password-file .vault_pass
```

#### Edit Vault Secrets

```bash
# Edit vault secrets securely
cd deploy
ansible-vault edit vault.yml --vault-password-file .vault_pass
```

#### Encrypt New Files

```bash
# Encrypt a new file with Ansible Vault
cd deploy
ansible-vault encrypt YOUR_FILE --vault-password-file .vault_pass
```

#### Rotate Vault Password

```bash
# Change vault password
cd deploy
ansible-vault rekey vault.yml --vault-password-file .vault_pass
# Update .vault_pass with new password after rekey
```

### Environment-Specific Deployments

#### Development Environment

```bash
# Deploy to development environment
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "env=development target_host=dev_pi"
```

#### Production Environment

```bash
# Deploy to production environment (requires confirmation)
echo "⚠️  Deploying to PRODUCTION environment"
read -p "Are you sure? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  cd deploy
  ansible-playbook -i inventory.yml playbook.yml \
    --vault-password-file .vault_pass \
    --extra-vars "env=production target_host=prod_pi"
else
  echo "Production deployment cancelled"
fi
```

---

## Monitoring & Maintenance

### Health Monitoring

#### System Health Checks

```bash
# Comprehensive system health overview
ssh pi@YOUR_PI_IP "
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

#### Container Health Monitoring

```bash
# Monitor Docker container health
ssh pi@YOUR_PI_IP "
  echo '=== Container Status ==='
  docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
  echo '=== Container Resource Usage ==='
  docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}'
"
```

#### Application Health Verification

```bash
# Verify TabloCrawler application health
ssh pi@YOUR_PI_IP "
  echo '=== Application Process Check ==='
  docker exec tabloCrawler ps aux
  echo '=== API Connectivity Test ==='
  docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1 | head -5
"
```

### Log Management

#### Real-Time Log Viewing

```bash
# View real-time application logs
ssh pi@YOUR_PI_IP "docker logs -f tabloCrawler"

# View filtered logs by pattern
ssh pi@YOUR_PI_IP "docker logs tabloCrawler 2>&1 | grep -i 'YOUR_PATTERN'"
```

#### Log Analysis

```bash
# Analyze recent logs for patterns
ssh pi@YOUR_PI_IP "
  echo '=== Recent Error Patterns ==='
  docker logs --since 1h tabloCrawler 2>&1 | grep -i error | tail -10
  
  echo '=== API Call Statistics ==='
  docker logs --since 1h tabloCrawler 2>&1 | grep -c 'API call' || echo 'No API calls found'
  
  echo '=== Table Scan Results ==='
  docker logs --since 1h tabloCrawler 2>&1 | grep -i 'balanced table' | tail -5
"
```

#### Log Collection and Archival

```bash
# Collect logs for analysis or support
LOG_DATE=$(date +%Y%m%d_%H%M%S)
ssh pi@YOUR_PI_IP "
  mkdir -p /tmp/logs/${LOG_DATE}
  
  # Application logs
  docker logs tabloCrawler > /tmp/logs/${LOG_DATE}/application.log 2>&1
  
  # System logs
  journalctl --since '1 day ago' > /tmp/logs/${LOG_DATE}/system.log
  
  # Create archive
  tar -czf /tmp/tabloCrawler_logs_${LOG_DATE}.tar.gz /tmp/logs/${LOG_DATE}
  echo 'Logs archived to: /tmp/tabloCrawler_logs_${LOG_DATE}.tar.gz'
"
```

### Performance Monitoring

#### Resource Usage Monitoring

```bash
# Monitor system resource usage
ssh pi@YOUR_PI_IP "
  echo '=== CPU Usage ==='
  top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1
  
  echo '=== Memory Details ==='
  cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Buffers|Cached'
  
  echo '=== Network Usage ==='
  cat /proc/net/dev | grep -E 'eth0|wlan0'
"
```

#### Application Performance Metrics

```bash
# Monitor application-specific performance
ssh pi@YOUR_PI_IP "
  echo '=== Container Resource Usage ==='
  docker stats --no-stream tabloCrawler
  
  echo '=== Process Tree ==='
  docker exec tabloCrawler ps auxf
"
```

### Maintenance Operations

#### Regular Maintenance Tasks

```bash
# Perform routine maintenance tasks
ssh pi@YOUR_PI_IP "
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

#### Security Updates

```bash
# Apply security updates
echo "⚠️  Applying security updates - this may restart services"
read -p "Continue? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  ssh pi@YOUR_PI_IP "
    sudo apt update
    sudo apt upgrade -y
    sudo apt autoremove -y
    
    # Restart container with latest security patches
    docker pull ghcr.io/your-org/tabloCrawler:latest
    docker restart tabloCrawler
  "
else
  echo "Security updates cancelled"
fi
```

---

## Emergency Procedures

### Emergency Quick Actions

#### Immediate Service Stop

```bash
# EMERGENCY: Stop all TabloCrawler services immediately
echo "🚨 EMERGENCY STOP - Stopping all TabloCrawler services"
read -p "Confirm emergency stop (type 'EMERGENCY'): " confirm
if [ "$confirm" = "EMERGENCY" ]; then
  ssh pi@YOUR_PI_IP "
    docker stop tabloCrawler
    docker kill tabloCrawler 2>/dev/null || true
    echo 'Emergency stop completed'
  "
else
  echo "Emergency stop cancelled"
fi
```

#### Emergency Service Restart

```bash
# EMERGENCY: Restart TabloCrawler service
echo "🚨 EMERGENCY RESTART - Restarting TabloCrawler"
ssh pi@YOUR_PI_IP "
  docker restart tabloCrawler || docker start tabloCrawler
  sleep 5
  docker ps | grep tabloCrawler
  echo 'Emergency restart completed'
"
```

#### Emergency Health Check

```bash
# EMERGENCY: Quick health assessment
echo "🚨 EMERGENCY HEALTH CHECK"
ssh pi@YOUR_PI_IP "
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

### Incident Response

#### Service Failure Response

```bash
# Respond to service failure incident
echo "🚨 SERVICE FAILURE RESPONSE"
ssh pi@YOUR_PI_IP "
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

#### API Connectivity Issues

```bash
# Respond to API connectivity issues
echo "🚨 API CONNECTIVITY ISSUE RESPONSE"
ssh pi@YOUR_PI_IP "
  echo '=== Network Connectivity Test ==='
  ping -c 3 api.tabloapp.com
  
  echo '=== DNS Resolution Test ==='
  nslookup api.tabloapp.com
  
  echo '=== API Endpoint Test ==='
  curl -I https://api.tabloapp.com --max-time 10
  
  echo '=== Application API Test ==='
  docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1 | head -3
"
```

### Rollback Procedures

#### Immediate Rollback to Previous Version

```bash
# EMERGENCY: Immediate rollback to previous version
echo "🚨 IMMEDIATE ROLLBACK"
read -p "Enter previous image tag (or 'latest-stable'): " prev_tag
ssh pi@YOUR_PI_IP "
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

#### Full System Rollback

```bash
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

### Recovery Procedures

#### Service Recovery

```bash
# Complete service recovery procedure
echo "🔧 SERVICE RECOVERY PROCEDURE"
ssh pi@YOUR_PI_IP "
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

#### Network Recovery

```bash
# Network connectivity recovery
echo "🔧 NETWORK RECOVERY PROCEDURE"
ssh pi@YOUR_PI_IP "
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

---

## Environment Variables Reference

Copy `runbook.env.example` to `runbook.env` and configure the following variables:

### Required Variables
- `TABLO_AUTH_TOKEN`: Your Tablo API authentication token

### Optional Variables
- `TELEGRAM_BOT_TOKEN`: Telegram bot token for notifications
- `TELEGRAM_CHAT_ID`: Telegram chat ID for receiving notifications
- `DAYS_TO_SCAN`: Number of days to scan ahead (1-7, default: 3)
- `MIN_PARTICIPANTS`: Minimum number of participants required (default: 2)
- `MAX_DISTANCE`: Maximum distance in kilometers for filtering (default: 10.0)
- `INTERVAL_SECONDS`: Scan interval in seconds for watch mode (default: 300)

### Deployment Variables
- `SSH_USER`: SSH username for Raspberry Pi (default: pi)
- `SSH_HOST`: IP address or hostname of Raspberry Pi
- `SSH_KEY_PATH`: Path to SSH private key (default: ~/.ssh/id_rsa)
- `ANSIBLE_VAULT_PASSWORD_FILE`: Path to Ansible vault password file

---

## Troubleshooting

### Common Issues

#### Permission Issues
```bash
# Fix file permissions
chmod +x src/index.ts
chmod 600 runbook.env
```

#### Dependency Issues
```bash
# Clear Bun cache and reinstall
bun pm cache rm
rm -rf node_modules bun.lock
bun install
```

#### Environment Issues
```bash
# Reset environment configuration
cp runbook.env.example runbook.env
echo "Environment reset - please reconfigure runbook.env"
```

### Getting Help

1. Check the logs: `docker logs tabloCrawler`
2. Verify configuration: `source runbook.env && env | grep TABLO`
3. Test connectivity: `ping api.tabloapp.com`
4. Review this runbook for relevant procedures
5. Collect diagnostics using the emergency procedures section

---

## Related Documentation

- [Project README](./README.md) - Project overview and basic setup
- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Deployment Documentation](./deploy/README.md) - Comprehensive deployment guide
- [User Monitoring Guide](./USER_MONITORING.md) - User monitoring feature documentation

---

*This runbook is also available as interactive Runme notebooks for enhanced usability. See the individual `runbook-*.md` files for the interactive versions.*