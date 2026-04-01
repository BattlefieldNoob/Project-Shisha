# TabloCrawler Ansible Role

This Ansible role manages the deployment of TabloCrawler containers on Raspberry Pi devices.

## Requirements

- Docker must be installed on the target system (use the `docker` role first)
- The `community.docker` Ansible collection must be installed
- Encrypted secrets must be defined in Ansible Vault

## Role Variables

### Required Variables (must be defined in vault or inventory)

- `vault_tablo_auth_token`: Tablo API authentication token
- `vault_telegram_bot_token`: Telegram bot token for notifications
- `vault_telegram_chat_id`: Telegram chat ID for notifications

### Optional Variables

- `docker_image`: Docker image name (default: `ghcr.io/your-org/tablocrawler/tablocrawler`)
- `image_tag`: Docker image tag (default: `latest`)
- `container_name`: Container name (default: `tablocrawler-monitor`)
- `app_base_dir`: Base directory for application data (default: `/home/{{ ansible_user }}/tablocrawler`)
- `monitoring_interval`: Monitoring interval in seconds (default: 60)
- `days_to_scan`: Number of days to scan ahead (default: 3)
- `search_latitude`: Search center latitude (default: Padova coordinates)
- `search_longitude`: Search center longitude (default: Padova coordinates)
- `search_radius`: Search radius in kilometers (default: 4)

## Dependencies

- `docker` role (for Docker installation)
- `community.docker` collection

## Example Playbook

```yaml
- hosts: raspberry_pis
  become: yes
  roles:
    - docker
    - tablocrawler
  vars:
    github_repo: "your-org/tablocrawler"
    monitoring_interval: 30
    search_radius: "5"
```

## Tasks Performed

1. Creates application directories with proper permissions
2. Stops and removes any existing TabloCrawler containers
3. Pulls the latest Docker image
4. Deploys new container with proper configuration
5. Waits for container to be healthy
6. Reports deployment status

## Container Configuration

The role configures the container with:
- Restart policy: `unless-stopped`
- Volume mounts for data and config persistence
- Environment variables for API tokens and monitoring settings
- Command: `watch-users` (user monitoring functionality only)

## Error Handling

- Gracefully handles missing containers during stop/remove operations
- Retries container health checks with timeout
- Provides detailed status reporting for troubleshooting