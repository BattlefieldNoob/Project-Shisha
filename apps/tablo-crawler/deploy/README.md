# TabloCrawler Raspberry Pi Deployment Guide

This guide provides comprehensive instructions for deploying TabloCrawler to Raspberry Pi devices using Ansible automation and Docker containers.

## Deployment Architecture

This deployment uses a **Docker-only approach** with the following components:
- **Docker Compose**: Container orchestration and configuration
- **Docker Containers**: Application runtime environment
- **Ansible**: Automated deployment and configuration management

No systemd services are created - containers are managed directly by Docker with restart policies.

## Prerequisites

### System Requirements
- **Control Machine**: 
  - Linux or macOS (native support)
  - Windows (requires WSL - Windows Subsystem for Linux)
- **Target Devices**: Raspberry Pi 3B+ or newer with ARM64 support
- **Operating System**: Raspberry Pi OS (64-bit) or Ubuntu Server ARM64
- **Network**: SSH access to all target Raspberry Pi devices

### Windows Users - WSL Setup Required

**Important**: Ansible does not run natively on Windows. You must use WSL (Windows Subsystem for Linux).

#### Install WSL:
```powershell
# Run in PowerShell as Administrator
wsl --install
# Restart your computer when prompted
```

#### Setup Ubuntu in WSL:
```bash
# After restart, open WSL and update packages
sudo apt update && sudo apt upgrade -y
```

All subsequent commands in this guide should be run inside your WSL environment, not in Windows Command Prompt or PowerShell.

### Required Software on Control Machine
- Python 3.8 or newer
- Ansible 2.12 or newer
- SSH client with key-based authentication configured

**Note for Windows users**: All software must be installed inside WSL, not on Windows directly.

## Installation and Setup

### 1. Install Ansible

#### On Ubuntu/Debian (including WSL):
```bash
sudo apt update
sudo apt install ansible
```

#### On macOS:
```bash
brew install ansible
```

#### On RHEL/CentOS/Fedora:
```bash
sudo dnf install ansible
# or for older versions:
sudo yum install epel-release
sudo yum install ansible
```

#### Using pip (all platforms, including WSL):
```bash
pip3 install ansible
```

#### Windows Users (WSL):
The recommended approach for Windows users is to use the Ubuntu/Debian method above inside your WSL environment:
```bash
# Inside WSL terminal
sudo apt update
sudo apt install ansible python3-pip
```

### 2. Install Required Ansible Collections

Install the Docker collection needed for container management:

```bash
ansible-galaxy collection install community.docker
```

### 3. SSH Key Setup

Generate SSH keys for passwordless authentication:

```bash
# Generate SSH key pair (if you don't have one)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key to your Raspberry Pi
ssh-copy-id pi@raspberrypi.local
```

Test SSH connectivity:
```bash
ssh pi@raspberrypi.local "echo 'Connection successful'"
```

#### Windows/WSL Users:
SSH keys generated in WSL are separate from Windows SSH keys. Make sure to:
- Generate and use SSH keys inside WSL
- All SSH operations must be performed from WSL terminal
- Your `~/.ssh/` directory in WSL is different from Windows

## Quick Start (Single Pi Development)

For a simple single Raspberry Pi development setup, the inventory is already configured for `raspberrypi.local`. Just follow these steps:

**Windows Users**: Execute all commands below in your WSL terminal, not in Windows Command Prompt or PowerShell.

### 1. Setup SSH Access
```bash
# Copy your SSH key to the Pi
ssh-copy-id pi@raspberrypi.local

# Test connection
ssh pi@raspberrypi.local "echo 'Connection successful'"
```

### 2. Configure Secrets
```bash
cd deploy

# Edit the vault file and replace placeholder values with your actual tokens
nano vault.yml  # or use your preferred editor

# After adding your tokens, encrypt the file
ansible-vault encrypt vault.yml
```

Required secrets in `vault.yml`:
```yaml
vault_tablo_auth_token: "your_actual_tablo_token_here"  # Required
vault_telegram_bot_token: ""                           # Optional (leave empty to disable)
vault_telegram_chat_id: ""                             # Optional (leave empty to disable)
```

### 3. Build Docker Image (First Time)
```bash
# Build the Docker image locally on your Pi or push to a registry
# Option 1: Build directly on Pi (recommended for development)
ssh pi@raspberrypi.local "cd /tmp && git clone <your-repo-url> && cd tablocrawler && docker build -t tablocrawler ."

# Option 2: Build locally and save/load (if you have Docker on your machine)
# docker build -t tablocrawler .
# docker save tablocrawler | ssh pi@raspberrypi.local "docker load"
```

### 4. Deploy
```bash
ansible-playbook -i inventory.yml playbook.yml --ask-vault-pass
```

### 4. Verify
```bash
ansible-playbook -i inventory.yml validate.yml
```

## Configuration

### 1. Inventory Configuration

The inventory is pre-configured for a single development Pi at `raspberrypi.local`:

```yaml
all:
  children:
    raspberry_pis:
      children:
        development:
          hosts:
            pi-dev:
              ansible_host: raspberrypi.local
              ansible_user: pi
              ansible_ssh_private_key_file: ~/.ssh/id_rsa
              location: "development"
              monitoring_interval: 300
              search_radius: "15"
              days_to_scan: 1
```

For multiple devices or different environments, you can expand this configuration.

### 2. Docker Image Configuration

The deployment expects a Docker image named `tablocrawler`. You have several options:

#### Option A: Local Image (Recommended for Development)
Build the image directly on your Pi:
```bash
ssh pi@raspberrypi.local
git clone <your-repo-url>
cd tablocrawler
docker build -t tablocrawler .
```

#### Option B: Registry Image
If you want to use a registry (GitHub Container Registry, Docker Hub, etc.), update `deploy/group_vars/raspberry_pis.yml`:
```yaml
github_repo: "ghcr.io/your-username/tablocrawler"  # Full registry path
docker_image: "{{ github_repo }}"
image_tag: "latest"
```

#### Option C: Custom Image Name
```yaml
docker_image: "my-custom-tablocrawler-image"
image_tag: "v1.0.0"
```

### 3. Custom Configuration (Optional)

For your single Pi setup, all configuration is in the inventory.yml file. If you need to customize settings, you can:

- Edit the host variables directly in `inventory.yml`
- Modify the development group variables in `deploy/group_vars/development.yml`
- Override variables in the vault file

### 4. Monitored Users Configuration

You have several options to configure the `monitored-users.txt` file:

#### Option A: Copy from Local File (Recommended)
Place your `monitored-users.txt` file in the deploy directory and run:
```bash
ansible-playbook -i inventory.yml playbook.yml
```

The playbook will automatically copy `../monitored-users.txt` if it exists.

#### Option B: Specify Custom File Path
```bash
ansible-playbook -i inventory.yml playbook.yml -e "monitored_users_file=/path/to/your/monitored-users.txt"
```

#### Option C: Use Content Variable
```bash
ansible-playbook -i inventory.yml playbook.yml -e "monitored_users_content='12345\n67890\n98765'"
```

#### Option D: Use Template with User List
Add to your inventory or group vars:
```yaml
monitored_users_list:
  - "12345"
  - "67890"
  - "98765"
```

Then run:
```bash
ansible-playbook -i inventory.yml playbook.yml -e "monitored_users_template=monitored-users.txt.j2"
```

### 5. Monitored Restaurants Configuration

TabloCrawler now supports restaurant monitoring in addition to user monitoring. You can configure the `monitored-restaurants.txt` file using the same methods as monitored users:

#### Option A: Copy from Local File (Recommended)
Place your `monitored-restaurants.txt` file in the deploy directory and run:
```bash
ansible-playbook -i inventory.yml playbook.yml
```

The playbook will automatically copy `../monitored-restaurants.txt` if it exists.

#### Option B: Specify Custom File Path
```bash
ansible-playbook -i inventory.yml playbook.yml -e "monitored_restaurants_file=/path/to/your/monitored-restaurants.txt"
```

#### Option C: Use Content Variable
```bash
ansible-playbook -i inventory.yml playbook.yml -e "monitored_restaurants_content='12345\n67890\n98765'"
```

#### Option D: Use Template with Restaurant List
Add to your inventory or group vars:
```yaml
monitored_restaurants:
  - id: "12345"
    name: "Trattoria da Mario"
  - id: "67890"
    name: "Osteria del Borgo"
  - id: "54321"
    comment: "Popular sushi place"
```

Then run:
```bash
ansible-playbook -i inventory.yml playbook.yml -e "monitored_restaurants_template=monitored-restaurants.txt.j2"
```

#### Dual Monitoring Mode
You can monitor both users and restaurants simultaneously. The system will:
- Send user-specific notifications when monitored users join/leave tables
- Send restaurant-specific notifications for all activity in monitored restaurants
- Cross-reference notifications (indicate when a monitored user joins a table in a monitored restaurant)

### 6. Secrets Management with Ansible Vault

Create encrypted secrets file:

```bash
# Create vault file
ansible-vault create deploy/vault.yml
```

Add your secrets in the vault file:
```yaml
vault_tablo_auth_token: "your_tablo_auth_token_here"
vault_telegram_bot_token: "your_telegram_bot_token_here"
vault_telegram_chat_id: "your_telegram_chat_id_here"
```

Create a vault password file (optional):
```bash
echo "your_vault_password" > ~/.ansible_vault_pass
chmod 600 ~/.ansible_vault_pass
```

Configure Ansible to use the password file in `deploy/ansible.cfg`:
```ini
[defaults]
vault_password_file = ~/.ansible_vault_pass
```

## Deployment Commands

### Basic Deployment

Deploy to your development Pi:
```bash
cd deploy
ansible-playbook -i inventory.yml playbook.yml
```

### Deploy to Specific Environment

Deploy to development environment (your current setup):
```bash
ansible-playbook -i inventory.yml playbook.yml --limit development
```

### Deploy to Specific Host

Deploy to your Pi specifically:
```bash
ansible-playbook -i inventory.yml playbook.yml --limit pi-dev
```

### Deployment with Custom Image Tag

Deploy a specific version:
```bash
ansible-playbook -i inventory.yml playbook.yml -e "image_tag=v1.2.3"
```

### Dry Run (Check Mode)

Test deployment without making changes:
```bash
ansible-playbook -i inventory.yml playbook.yml --check
```

### Verbose Output

Run with detailed output for debugging:
```bash
ansible-playbook -i inventory.yml playbook.yml -vvv
```

## Update and Maintenance Commands

### Pull Latest Docker Images Only
```bash
# Pull latest images without updating containers
ansible-playbook -i inventory.yml pull.yml

# Force pull even if image exists locally
ansible-playbook -i inventory.yml pull.yml -e "force=true"

# Pull specific image tag
ansible-playbook -i inventory.yml pull.yml -e "image_tag=v1.2.3"
```

### Update Configuration Only
```bash
# Update configuration files and restart containers
ansible-playbook -i inventory.yml config-only.yml

# Update configuration without restarting containers
ansible-playbook -i inventory.yml config-only.yml -e "restart=false"

# Update configuration without creating backups
ansible-playbook -i inventory.yml config-only.yml -e "backup=false"

# Update with custom monitored users file
ansible-playbook -i inventory.yml config-only.yml -e "monitored_users_file=/path/to/users.txt"

# Update with inline user content
ansible-playbook -i inventory.yml config-only.yml -e "monitored_users_content='12345\n67890'"
```

### Complete Update (Image + Configuration)
```bash
# Pull new image and update configuration
ansible-playbook -i inventory.yml update.yml

# Update without pulling new image
ansible-playbook -i inventory.yml update.yml -e "pull=false"

# Update configuration only, skip container restart
ansible-playbook -i inventory.yml update.yml -e "restart=false"

# Update image only, skip configuration
ansible-playbook -i inventory.yml update.yml -e "config=false"

# Force pull new image even if up-to-date
ansible-playbook -i inventory.yml update.yml -e "pull=true"
```

### Targeted Updates
```bash
# Update only docker-compose configuration
ansible-playbook -i inventory.yml config-only.yml --tags docker-compose

# Update only monitored users file
ansible-playbook -i inventory.yml config-only.yml --tags monitored-users

# Update only environment variables
ansible-playbook -i inventory.yml config-only.yml --tags environment
```

## Ansible Vault Management

### Edit Encrypted Files
```bash
ansible-vault edit deploy/vault.yml
```

### View Encrypted Files
```bash
ansible-vault view deploy/vault.yml
```

### Change Vault Password
```bash
ansible-vault rekey deploy/vault.yml
```

### Encrypt Existing File
```bash
ansible-vault encrypt deploy/secrets.yml
```

### Decrypt File
```bash
ansible-vault decrypt deploy/vault.yml
```

## Validation and Testing

### Test Connectivity
```bash
ansible -i inventory.yml development -m ping
```

### Check Docker Installation
```bash
ansible -i inventory.yml development -m command -a "docker --version"
```

### Verify Container Status
```bash
ansible -i inventory.yml development -m command -a "docker ps"
```

### Check Container Status
```bash
ansible -i inventory.yml development -m command -a "docker ps --filter name=tablocrawler"
```

### Run Validation Playbook
```bash
ansible-playbook -i inventory.yml validate.yml
```

## Rollback Procedures

### Rollback to Previous Version

Deploy previous known-good version:
```bash
ansible-playbook -i inventory.yml rollback.yml -e "rollback_version=v1.1.0"
```

### Emergency Stop

Stop all containers immediately:
```bash
ansible -i inventory.yml raspberry_pis -m docker_container -a "name=tablocrawler-monitor state=stopped"
```

### Restart Containers

Restart Docker containers:
```bash
ansible -i inventory.yml development -m docker_container -a "name=tablocrawler-monitor state=started restart=yes"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. SSH Connection Failures

**Problem**: `UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh"}`

**Solutions**:
- Verify SSH key is added to the Pi: `ssh-copy-id pi@192.168.1.100`
- Check SSH service is running on Pi: `sudo systemctl status ssh`
- Verify correct IP address in inventory
- Test manual SSH connection: `ssh pi@192.168.1.100`

#### 2. Docker Python SDK Missing

**Problem**: `ModuleNotFoundError: No module named 'docker'`

**Solutions**:
- The Docker role should install this automatically
- Manual installation on Pi: `sudo pip3 install docker>=5.0.0`
- Verify Python path: Check `ansible_python_interpreter` in inventory
- Re-run the Docker role: `ansible-playbook -i inventory.yml playbook.yml --tags docker`

#### 3. Permission Denied Errors

**Problem**: `FAILED! => {"changed": false, "msg": "Permission denied"}`

**Solutions**:
- Add user to docker group: `sudo usermod -aG docker pi`
- Use become (sudo) in playbook: `become: yes`
- Check file permissions on SSH keys: `chmod 600 ~/.ssh/id_rsa`

#### 4. Docker Installation Failures

**Problem**: Docker installation fails or times out

**Solutions**:
- Update package cache: `sudo apt update`
- Check internet connectivity on Pi
- Use alternative Docker installation method
- Manually install Docker first: `curl -fsSL https://get.docker.com | sh`

#### 5. Container Pull Failures

**Problem**: `Error response from daemon: pull access denied`

**Solutions**:
- Verify image name and tag are correct
- Check GitHub Container Registry permissions
- Ensure GitHub Personal Access Token is configured in vault.yml
- Test authentication manually: `docker login ghcr.io`
- Verify token has `read:packages` permission
- Check if repository is private and requires authentication

**GitHub Container Registry Authentication Setup**:
1. Create Personal Access Token at https://github.com/settings/tokens
2. Select `read:packages` scope for private repositories
3. Add credentials to vault.yml:
   ```yaml
   vault_github_username: "your_username"
   vault_github_token: "ghp_your_token_here"
   ```
4. Re-encrypt vault: `ansible-vault encrypt vault.yml`
5. Run deployment with docker-auth role included

#### 6. Ansible Vault Issues

**Problem**: `ERROR! Attempting to decrypt but no vault secrets found`

**Solutions**:
- Provide vault password: `ansible-playbook --ask-vault-pass`
- Check vault password file path in ansible.cfg
- Verify vault file is properly encrypted: `ansible-vault view vault.yml`

#### 7. Container Start Failures

**Problem**: Docker container fails to start

**Solutions**:
- Check container logs: `docker logs tablocrawler-monitor`
- Verify Docker container runs manually: `docker run --rm tablocrawler`
- Check environment variables and configuration
- Verify volume mounts and permissions

### Debugging Commands

#### Check Ansible Configuration
```bash
ansible-config dump --only-changed
```

#### Test Inventory Parsing
```bash
ansible-inventory -i inventory.yml --list
```

#### Debug Specific Task
```bash
ansible-playbook -i inventory.yml playbook.yml --start-at-task "Install Docker"
```

#### Check Facts
```bash
ansible -i inventory.yml raspberry_pis -m setup
```

### Log Locations

- **Ansible logs**: `/var/log/ansible.log` (if configured)
- **Container logs**: `docker logs tablocrawler-monitor`
- **Docker daemon logs**: `journalctl -u docker`
- **Application logs**: `/opt/tablocrawler/logs/` (if volume mounted)

## Monitoring and Maintenance

### Regular Health Checks

Create a monitoring script to check deployment health:

```bash
#!/bin/bash
# health-check.sh
ansible -i inventory.yml raspberry_pis -m command -a "docker ps --filter name=tablocrawler --format 'table {{.Names}}\t{{.Status}}'"
```

### Log Collection

Collect logs from all devices:
```bash
ansible -i inventory.yml raspberry_pis -m fetch -a "src=/var/log/tablocrawler.log dest=./logs/"
```

### Update Deployments

Regular update procedure:
1. Build new Docker image via GitHub Actions
2. Test deployment in staging environment
3. Deploy to production with specific version tag
4. Verify health checks pass
5. Monitor for issues

## Security Best Practices

### SSH Security
- Use key-based authentication only
- Disable password authentication: `PasswordAuthentication no` in `/etc/ssh/sshd_config`
- Use non-standard SSH port if needed
- Regularly rotate SSH keys

### Ansible Vault Security
- Use strong vault passwords
- Store vault password securely (not in version control)
- Regularly rotate vault passwords
- Limit access to vault files

### Container Security
- Use non-root user in containers
- Keep base images updated
- Scan images for vulnerabilities
- Use minimal base images

### Network Security
- Use VPN for remote access
- Configure firewall rules
- Monitor network traffic
- Use secure communication channels

## Advanced Configuration

### Custom Ansible Configuration

Create `deploy/ansible.cfg` for project-specific settings:

```ini
[defaults]
inventory = inventory.yml
host_key_checking = False
timeout = 30
gathering = smart
fact_caching = memory
stdout_callback = yaml
vault_password_file = ~/.ansible_vault_pass

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True
```

### Parallel Execution

Configure parallel execution for faster deployments:

```bash
ansible-playbook -i inventory.yml playbook.yml --forks 10
```

### Custom Callbacks

Enable additional output plugins:

```ini
[defaults]
stdout_callback = debug
callback_whitelist = timer, profile_tasks
```

## Log Management and Troubleshooting

### View Container Logs

#### Quick Log Check (Last 50 lines)
```bash
# View logs from all Raspberry Pi devices
ansible-playbook -i inventory.yml logs.yml

# View more lines
ansible-playbook -i inventory.yml logs.yml -e "lines=100"

# View logs from specific host
ansible-playbook -i inventory.yml logs.yml --limit pi-dev
```

#### Follow Logs in Real-Time
```bash
# Follow logs (use Ctrl+C to stop)
ansible-playbook -i inventory.yml logs.yml -e "follow=true"
```

#### Manual Log Commands
```bash
# SSH to Pi and check logs manually
ssh pi@raspberrypi.local
docker logs tablocrawler-monitor

# Follow logs manually
docker logs -f tablocrawler-monitor

# Get last 100 lines with timestamps
docker logs --tail 100 -t tablocrawler-monitor
```

### Comprehensive Troubleshooting

#### Full System Diagnostics
```bash
# Run complete troubleshooting playbook
ansible-playbook -i inventory.yml troubleshoot.yml

# Troubleshoot specific host
ansible-playbook -i inventory.yml troubleshoot.yml --limit pi-dev
```

This will provide:
- System information (OS, memory, disk space)
- Docker service status
- Container status and configuration
- Recent container logs
- Network connectivity tests
- Configuration file status
- Troubleshooting recommendations

#### Quick Status Checks
```bash
# Check if containers are running
ansible -i inventory.yml raspberry_pis -m command -a "docker ps --filter name=tablocrawler"

# Check container health
ansible -i inventory.yml raspberry_pis -m command -a "docker inspect --format='{{.State.Health.Status}}' tablocrawler-monitor"

# Check system resources
ansible -i inventory.yml raspberry_pis -m command -a "free -h && df -h"
```

### Log Analysis Tips

#### Common Log Patterns to Look For
- **Startup Issues**: Look for errors during container initialization
- **API Connectivity**: Check for HTTP errors or timeout messages
- **Authentication**: Verify Tablo API token is working
- **Memory Issues**: Watch for out-of-memory errors
- **Network Problems**: Look for DNS resolution or connection failures

#### Useful Log Commands
```bash
# Search for errors in logs
docker logs tablocrawler-monitor 2>&1 | grep -i error

# Check for API authentication issues
docker logs tablocrawler-monitor 2>&1 | grep -i "auth\|token\|401\|403"

# Monitor resource usage
docker stats tablocrawler-monitor

# Check container restart count
docker inspect tablocrawler-monitor | grep -i restartcount
```

## Support and Resources

### Documentation Links
- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Ansible Collection](https://docs.ansible.com/ansible/latest/collections/community/docker/)
- [Ansible Vault Guide](https://docs.ansible.com/ansible/latest/user_guide/vault.html)

### Community Resources
- [Ansible Community](https://www.ansible.com/community)
- [Docker Community](https://www.docker.com/community)
- [Raspberry Pi Forums](https://www.raspberrypi.org/forums/)

For additional support or questions about this deployment setup, please refer to the project documentation or create an issue in the project repository.