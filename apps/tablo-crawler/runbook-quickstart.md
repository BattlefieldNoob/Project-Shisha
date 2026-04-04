# 🚀 TabloCrawler Quick Start

Welcome to the TabloCrawler operations runbook! This interactive guide will get you up and running quickly.

## Prerequisites

Ensure you have the following installed:

- Bun runtime
- Git
- SSH access to target Raspberry Pi (for deployment)

## 🔧 Development Quick Start

### 1. Environment Setup

First, let's set up your environment variables:

```bash {"id":"setup-env","interactive":"true","name":"setup-environment"}
# Copy the environment template
cp runbook.env.example runbook.env

# Edit the environment file with your settings
${EDITOR:-nano} runbook.env
```

### 2. Install Dependencies

```bash {"id":"install-deps","name":"install-dependencies"}
# Install project dependencies
bun install
```

### 3. Verify Configuration

```bash {"id":"verify-config","interactive":"true","name":"verify-configuration"}
# Load environment variables
source runbook.env

# Verify Tablo API connectivity
bun run src/index.ts users --id-ristorante ${TEST_RESTAURANT_ID:-12345} --min-partecipazioni 1
```

### 4. Run Table Scanner

```bash {"id":"run-scanner","interactive":"true","name":"run-table-scanner"}
# Run the main table scanning functionality
bun run scan
```

### 5. Monitor Users (Optional)

```bash {"id":"monitor-users","interactive":"true","name":"monitor-users"}
# Monitor users for a specific restaurant
bun run users -- --id-ristorante ${RESTAURANT_ID} --min-partecipazioni ${MIN_PARTICIPANTS:-2}
```

## 🚀 Deployment Quick Start

### 1. SSH Key Setup

```bash {"id":"setup-ssh","interactive":"true","name":"setup-ssh-keys"}
# Generate SSH key if you don't have one
if [ ! -f ~/.ssh/id_rsa ]; then
    ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
fi

# Copy SSH key to Raspberry Pi
ssh-copy-id ${SSH_USER:-pi}@${SSH_HOST}
```

### 2. Ansible Vault Setup

```bash {"id":"setup-vault","interactive":"true","name":"setup-ansible-vault"}
# Create vault password file
echo "${ANSIBLE_VAULT_PASSWORD}" > deploy/.vault_pass
chmod 600 deploy/.vault_pass

# Verify vault access
ansible-vault view deploy/vault.yml --vault-password-file deploy/.vault_pass
```

### 3. Deploy to Raspberry Pi

```bash {"id":"deploy-full","interactive":"true","name":"full-deployment"}
# Run full deployment
cd deploy
ansible-playbook -i inventory.yml playbook.yml --vault-password-file .vault_pass
```

## 🚨 Emergency Quick Reference

### Stop All Services

```bash {"id":"emergency-stop","interactive":"true","name":"emergency-stop","category":"emergency"}
# Stop all TabloCrawler services immediately
cd deploy
ansible-playbook -i inventory.yml playbook.yml --tags stop --vault-password-file .vault_pass
```

### View Live Logs

```bash {"id":"view-logs","interactive":"true","name":"view-live-logs"}
# View real-time logs from Raspberry Pi
ssh ${SSH_USER:-pi}@${SSH_HOST} "docker logs -f tabloCrawler"
```

### Health Check

```bash {"id":"health-check","name":"quick-health-check"}
# Quick health check
cd deploy
ansible-playbook -i inventory.yml validate.yml --vault-password-file .vault_pass
```

## 📚 Next Steps

- **Development**: See [runbook-development.md](./runbook-development.md) for detailed development workflows
- **Deployment**: See [runbook-deployment.md](./runbook-deployment.md) for comprehensive deployment procedures
- **Monitoring**: See [runbook-monitoring.md](./runbook-monitoring.md) for monitoring and maintenance
- **Emergency**: See [runbook-emergency.md](./runbook-emergency.md) for emergency procedures

## 🔗 Quick Links

- [Project README](./README.md)
- [Setup Guide](./SETUP.md)
- [Deployment Documentation](./deploy/README.md)
- [User Monitoring Guide](./USER_MONITORING.md)
