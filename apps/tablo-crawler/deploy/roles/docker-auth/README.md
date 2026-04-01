# Docker Authentication Role

This Ansible role configures Docker authentication for GitHub Container Registry (ghcr.io) on Raspberry Pi devices, enabling automatic pulling of private Docker images.

## Requirements

- Docker must be installed and running on the target system
- GitHub Personal Access Token with `read:packages` permission
- Ansible community.docker collection

## Role Variables

### Required Variables (stored in vault.yml)

```yaml
vault_github_username: "your_github_username"
vault_github_token: "ghp_your_personal_access_token_here"
```

### Optional Variables

- `github_registry`: GitHub Container Registry URL (default: `ghcr.io`)
- `docker_config_path`: Path to Docker configuration file (default: `~/.docker/config.json`)
- `docker_auth_retries`: Number of authentication retries (default: `3`)
- `docker_auth_delay`: Delay between retries in seconds (default: `5`)

## Dependencies

- `docker` role (must be run before this role)
- `community.docker` Ansible collection

## Example Playbook

```yaml
- hosts: raspberry_pis
  become: yes
  vars_files:
    - vault.yml
  roles:
    - docker
    - docker-auth
    - tablocrawler
```

## GitHub Personal Access Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `read:packages` - Required to pull private container images
4. Copy the generated token and add it to your `vault.yml` file
5. Encrypt the vault file: `ansible-vault encrypt vault.yml`

## Usage

This role will:

1. Create the `~/.docker` directory with proper permissions
2. Generate a Docker authentication configuration file
3. Test authentication with GitHub Container Registry
4. Verify that the specified Docker image can be pulled
5. Display success confirmation

## Error Handling

The role includes comprehensive error handling:

- Retries authentication attempts with exponential backoff
- Validates credentials before proceeding
- Provides clear error messages for troubleshooting
- Backs up existing Docker configuration files

## Security Considerations

- Credentials are stored using Ansible Vault encryption
- Docker configuration files have restricted permissions (600)
- Authentication tokens are not logged in Ansible output
- Supports credential rotation without service interruption

## Troubleshooting

### Authentication Failures

1. Verify GitHub Personal Access Token has correct permissions
2. Check that the token hasn't expired
3. Ensure the GitHub username is correct
4. Verify network connectivity to ghcr.io

### Permission Issues

1. Check Docker daemon is running: `sudo systemctl status docker`
2. Verify user has Docker permissions: `groups $USER`
3. Check Docker configuration directory permissions

### Image Pull Failures

1. Verify the image name and tag are correct
2. Check that the repository is accessible with the provided credentials
3. Ensure sufficient disk space for image download

## Example Commands

```bash
# Test authentication manually
docker login ghcr.io

# Pull image manually to test
docker pull ghcr.io/your-org/your-repo:latest

# Check Docker configuration
cat ~/.docker/config.json
```