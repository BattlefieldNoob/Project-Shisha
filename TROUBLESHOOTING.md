# Troubleshooting Guide

> Common issues and solutions for Project Shisha.

---

## Development Issues

### Bun not found

**Symptom:** `bun: command not found`

**Solution:**
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or via npm
npm install -g bun
```

---

### Dependency installation fails

**Symptom:** `bun install` fails with errors

**Solution:**
```bash
# Clear cache and retry
rm -rf node_modules bun.lock
bun install
```

---

### App won't start locally

**Symptom:** `bun run dev` exits immediately

**Solution:**
1. Check `.env` file exists (copy from `.env.example`)
2. Check required env vars are set
3. Check port is not already in use:
```bash
lsof -i :3000
```

---

## Docker Issues

### Image build fails

**Symptom:** `docker build` exits with error

**Common causes and solutions:**

**1. Missing dependencies:**
```bash
# Ensure lockfile exists
ls -la bun.lock
```

**2. Wrong Dockerfile path:**
```bash
# Use correct path
docker build -f apps/fuel-advisor-bot/Dockerfile .
```

**3. Outdated base image:**
```dockerfile
# Update in Dockerfile
FROM oven/bun:1
```

---

### Container won't start

**Symptom:** `docker run` exits immediately

**Debug:**
```bash
# Check logs
docker logs <container-name>

# Check status
docker ps -a
```

**Common causes:**
- Missing `.env` file
- Wrong env var values
- Port already in use
- Missing volume mounts

---

### Watchtower not updating

**Symptom:** Container not updating automatically

**Check:**
1. Is Watchtower running?
```bash
docker ps | grep watchtower
```

2. Does container have the label?
```bash
docker inspect <container> | grep -A5 Labels
```

3. Should show: `"com.centurylinklabs.watchtower.enable": "true"`

**Solution:**
```yaml
# In compose.yml, ensure:
services:
  app:
    labels:
      com.centurylinklabs.watchtower.enable: "true"
```

---

## Deployment Issues

### Ansible connection fails

**Symptom:** `FAILED! => playbook: deploy-app.yml`

**Check:**
1. SSH key is set up:
```bash
ssh -i ~/.ssh/id_rsa user@server
```

2. Inventory file is correct:
```bash
cat ansible/inventories/production/hosts.ini
```

3. Host is reachable:
```bash
ping production-server
```

---

### Docker not installed on server

**Symptom:** `docker: command not found` on remote

**Solution:**
Run bootstrap playbook first:
```bash
ansible-playbook ansible/playbooks/bootstrap-machine.yml
```

---

### Deployment succeeds but app crashes

**Symptom:** Container starts then immediately stops

**Debug:**
```bash
# On server
docker logs <container-name>
docker inspect <container-name>
```

**Check:**
- Environment variables match `.env.example`
- Volume paths exist
- Database initialized

---

## Network Issues

### Can't access container from host

**Symptom:** `curl localhost:3001` fails

**Check:**
1. Port mapping in compose.yml:
```yaml
ports:
  - "3001:3000"  # host:container
```

2. Container is running:
```bash
docker ps
```

3. Firewall not blocking:
```bash
# On server
sudo ufw allow 3001/tcp
```

---

## Database Issues

### SQLite database corrupted

**Symptom:** App throws database errors

**Solution:**
```bash
# Backup existing
cp data.db data.db.backup

# Recreate
rm data.db
# Restart app to recreate
```

---

## CI/CD Issues

### GitHub Actions fails

**Symptom:** Workflow fails at build or push

**Check:**
1. Repository has GHCR write access
2. Docker build works locally
3. Secrets configured:
   - `GHCR_TOKEN`
   - `GHCR_USERNAME`

---

### Image tag mismatch

**Symptom:** Watchtower says "up to date" but image changed

**Check:**
1. Image tag in compose.yml matches pushed tag
2. Use explicit tags (not `latest` only):
```yaml
image: ghcr.io/user/app:v1.2.3
```

---

## Quick Diagnostics Commands

```bash
# Check all containers
docker ps -a

# View all logs
docker logs <name>

# Check resource usage
docker stats

# Network inspection
docker network ls
docker network inspect <network>

# Clean up unused
docker system prune -a
```

---

## Getting Help

1. Check [README.md](../README.md) for overview
2. Check [ARCHITECTURE.md](../ARCHITECTURE.md) for design
3. Check app-specific README in `apps/<app>/`
4. Check CI workflow logs in GitHub

---

## Emergency Contacts

- Docker issues: Check `docker logs`
- Ansible issues: Run with `-v` for verbose
- CI issues: Check GitHub Actions workflow run