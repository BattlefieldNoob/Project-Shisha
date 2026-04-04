# 🚀 TabloCrawler Deployment Operations

Interactive deployment guide for TabloCrawler on Raspberry Pi using Ansible automation.

## Prerequisites

### SSH Configuration

```bash {"id":"setup-ssh-keys","interactive":"true","name":"setup-ssh-access"}
# Generate SSH key pair if needed
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -C "tabloCrawler-deployment"
fi

# Copy SSH key to target Raspberry Pi
ssh-copy-id ${SSH_USER:-pi}@${SSH_HOST}

# Test SSH connectivity
ssh ${SSH_USER:-pi}@${SSH_HOST} "echo 'SSH connection successful'"
```

### Ansible Vault Setup

```bash {"id":"setup-vault-password","interactive":"true","name":"setup-vault-password"}
# Create vault password file
echo "${ANSIBLE_VAULT_PASSWORD}" > deploy/.vault_pass
chmod 600 deploy/.vault_pass

# Verify vault password works
ansible-vault view deploy/vault.yml --vault-password-file deploy/.vault_pass | head -5
```

### Inventory Configuration

```bash {"id":"configure-inventory","interactive":"true","name":"configure-inventory"}
# Edit inventory file
${EDITOR:-nano} deploy/inventory.yml

# Validate inventory
ansible-inventory -i deploy/inventory.yml --list
```

## Core Deployment Workflows

### Full Initial Deployment

```bash {"id":"deploy-full","interactive":"true","name":"full-deployment","category":"deployment"}
# Complete deployment with all components
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "target_host=${TARGET_HOST:-raspberry_pi}"
```

### Configuration-Only Update

```bash {"id":"deploy-config","interactive":"true","name":"config-only-deployment"}
# Deploy only configuration changes
cd deploy
ansible-playbook -i inventory.yml config-only.yml \
  --vault-password-file .vault_pass \
  --extra-vars "target_host=${TARGET_HOST:-raspberry_pi}"
```

### Application Update

```bash {"id":"deploy-update","interactive":"true","name":"application-update"}
# Update application image and restart services
cd deploy
ansible-playbook -i inventory.yml update.yml \
  --vault-password-file .vault_pass \
  --extra-vars "target_host=${TARGET_HOST:-raspberry_pi}"
```

### Pull Latest Images

```bash {"id":"deploy-pull","name":"pull-latest-images"}
# Pull latest Docker images without restart
cd deploy
ansible-playbook -i inventory.yml pull.yml \
  --vault-password-file .vault_pass
```

## Ansible Vault Management

### View Vault Contents

```bash {"id":"vault-view","name":"view-vault-contents"}
# View encrypted vault contents
cd deploy
ansible-vault view vault.yml --vault-password-file .vault_pass
```

### Edit Vault Secrets

```bash {"id":"vault-edit","interactive":"true","name":"edit-vault-secrets"}
# Edit vault secrets securely
cd deploy
ansible-vault edit vault.yml --vault-password-file .vault_pass
```

### Encrypt New Files

```bash {"id":"vault-encrypt","interactive":"true","name":"encrypt-new-file"}
# Encrypt a new file with Ansible Vault
cd deploy
ansible-vault encrypt ${FILE_TO_ENCRYPT} --vault-password-file .vault_pass
```

### Rotate Vault Password

```bash {"id":"vault-rekey","interactive":"true","name":"rotate-vault-password"}
# Change vault password
cd deploy
ansible-vault rekey vault.yml --vault-password-file .vault_pass
# Update .vault_pass with new password after rekey
```

## Environment-Specific Deployments

### Development Environment

```bash {"id":"deploy-dev","interactive":"true","name":"deploy-development"}
# Deploy to development environment
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "env=development target_host=dev_pi"
```

### Staging Environment

```bash {"id":"deploy-staging","interactive":"true","name":"deploy-staging"}
# Deploy to staging environment
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "env=staging target_host=staging_pi"
```

### Production Environment

```bash {"id":"deploy-prod","interactive":"true","name":"deploy-production","category":"deployment"}
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

## Deployment Validation

### Health Check Validation

```bash {"id":"validate-deployment","name":"validate-deployment-health"}
# Validate deployment health
cd deploy
ansible-playbook -i inventory.yml validate.yml \
  --vault-password-file .vault_pass
```

### Service Status Check

```bash {"id":"check-services","name":"check-service-status"}
# Check all service statuses
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  echo '=== Docker Status ==='
  docker ps -a
  echo '=== System Resources ==='
  free -h
  df -h
  echo '=== Service Logs (last 10 lines) ==='
  docker logs --tail 10 tabloCrawler
"
```

### Connectivity Tests

```bash {"id":"test-connectivity","name":"test-deployment-connectivity"}
# Test application connectivity
echo "Testing TabloCrawler connectivity..."
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  docker exec tabloCrawler bun run src/index.ts users --id-ristorante 12345 --min-partecipazioni 1
"
```

## Rollback Procedures

### Quick Rollback

```bash {"id":"rollback-quick","interactive":"true","name":"quick-rollback","category":"emergency"}
# Quick rollback to previous version
echo "⚠️  Performing quick rollback"
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  docker stop tabloCrawler
  docker run --name tabloCrawler_backup --rm -d \
    --env-file /opt/tabloCrawler/.env \
    ${PREVIOUS_IMAGE:-ghcr.io/your-org/tabloCrawler:previous}
"
```

### Full Environment Rollback

```bash {"id":"rollback-full","interactive":"true","name":"full-rollback","category":"emergency"}
# Full rollback using Ansible
echo "⚠️  Performing full environment rollback"
read -p "Enter previous version tag: " prev_version
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "image_tag=${prev_version} target_host=${TARGET_HOST:-raspberry_pi}"
```

## Maintenance Operations

### System Updates

```bash {"id":"update-system","interactive":"true","name":"update-raspberry-pi-system"}
# Update Raspberry Pi system packages
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  sudo apt update
  sudo apt upgrade -y
  sudo apt autoremove -y
"
```

### Docker Maintenance

```bash {"id":"docker-cleanup","name":"docker-system-cleanup"}
# Clean up Docker system
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  docker system prune -f
  docker image prune -f
  docker volume prune -f
"
```

### Log Rotation

```bash {"id":"rotate-logs","name":"rotate-application-logs"}
# Rotate application logs
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  docker logs tabloCrawler > /tmp/tabloCrawler_$(date +%Y%m%d).log
  docker restart tabloCrawler
"
```

## Backup and Restore

### Create Backup

```bash {"id":"create-backup","interactive":"true","name":"create-system-backup"}
# Create full system backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  sudo mkdir -p /backup/${BACKUP_DATE}
  sudo cp -r /opt/tabloCrawler /backup/${BACKUP_DATE}/
  sudo tar -czf /backup/tabloCrawler_${BACKUP_DATE}.tar.gz /backup/${BACKUP_DATE}
"
```

### Restore from Backup

```bash {"id":"restore-backup","interactive":"true","name":"restore-from-backup","category":"emergency"}
# Restore from backup
echo "⚠️  Restoring from backup"
read -p "Enter backup date (YYYYMMDD_HHMMSS): " backup_date
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  sudo docker stop tabloCrawler
  sudo tar -xzf /backup/tabloCrawler_${backup_date}.tar.gz -C /
  sudo docker start tabloCrawler
"
```

## Troubleshooting Deployments

### Deployment Diagnostics

```bash {"id":"diagnose-deployment","name":"diagnose-deployment-issues"}
# Comprehensive deployment diagnostics
cd deploy
echo "=== Ansible Connectivity ==="
ansible all -i inventory.yml -m ping --vault-password-file .vault_pass

echo "=== Target System Info ==="
ansible all -i inventory.yml -m setup --vault-password-file .vault_pass | grep ansible_distribution

echo "=== Docker Status ==="
ansible all -i inventory.yml -m shell -a "docker --version && docker ps" --vault-password-file .vault_pass
```

### Fix Common Issues

```bash {"id":"fix-permissions","name":"fix-deployment-permissions"}
# Fix common permission issues
cd deploy
ansible-playbook -i inventory.yml fix-permissions.yml \
  --vault-password-file .vault_pass
```

```bash {"id":"restart-services","name":"restart-all-services"}
# Restart all services
ssh ${SSH_USER:-pi}@${SSH_HOST} "
  sudo systemctl restart docker
  docker restart tabloCrawler
"
```

### Log Collection

```bash {"id":"collect-logs","name":"collect-deployment-logs"}
# Collect comprehensive logs for troubleshooting
cd deploy
ansible-playbook -i inventory.yml logs.yml \
  --vault-password-file .vault_pass
```

## Advanced Deployment Options

### Custom Image Deployment

```bash {"id":"deploy-custom-image","interactive":"true","name":"deploy-custom-image"}
# Deploy specific image version
read -p "Enter image tag: " image_tag
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --extra-vars "image_tag=${image_tag}"
```

### Selective Component Updates

```bash {"id":"update-selective","interactive":"true","name":"selective-component-update"}
# Update specific components only
read -p "Enter component tags (comma-separated): " tags
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --tags "${tags}"
```

### Multi-Host Deployment

```bash {"id":"deploy-multi-host","interactive":"true","name":"multi-host-deployment"}
# Deploy to multiple hosts simultaneously
cd deploy
ansible-playbook -i inventory.yml playbook.yml \
  --vault-password-file .vault_pass \
  --limit "raspberry_pi_group"
```

## 📚 Related Documentation

- [Quick Start Guide](./runbook-quickstart.md)
- [Development Workflows](./runbook-development.md)
- [Monitoring Guide](./runbook-monitoring.md)
- [Emergency Procedures](./runbook-emergency.md)
- [Deployment README](./deploy/README.md)
