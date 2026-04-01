# Docker Installation Role

This Ansible role installs Docker CE on ARM64 Raspberry Pi devices running Raspberry Pi OS or Ubuntu.

## Requirements

- Ansible 2.9 or higher
- Target system running Raspberry Pi OS (Debian-based) or Ubuntu
- ARM64 architecture
- Sudo privileges on target system

## Role Variables

Available variables are listed below, along with default values (see `defaults/main.yml`):

```yaml
# Docker packages to install
docker_packages:
  - docker-ce
  - docker-ce-cli
  - containerd.io
  - docker-buildx-plugin
  - docker-compose-plugin

# Required system packages for Docker installation
docker_prerequisites:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - lsb-release

# Docker service configuration
docker_service_enabled: true
docker_service_state: started

# User configuration
docker_add_user_to_group: true
docker_user: "{{ ansible_user }}"

# Repository configuration
docker_apt_cache_valid_time: 3600
```

## Dependencies

None.

## Example Playbook

```yaml
- hosts: raspberry_pis
  become: yes
  roles:
    - docker
```

## Features

- Automatically detects Raspberry Pi OS (Debian) vs Ubuntu distributions
- Installs Docker CE from official Docker repositories
- Adds the specified user to the docker group for non-root access
- Starts and enables Docker service
- Verifies Docker installation and daemon connectivity
- Supports ARM64 architecture specifically

## Supported Distributions

- Raspberry Pi OS (Debian-based)
- Ubuntu 20.04 LTS (Focal)
- Ubuntu 22.04 LTS (Jammy)

## License

MIT

## Author Information

Created for TabloCrawler Raspberry Pi deployment automation.