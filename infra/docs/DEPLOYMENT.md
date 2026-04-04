# Deployment Guide

> Step-by-step deployment process for Project Shisha applications.

## Prerequisites

| Tool    | Version | Purpose               |
| ------- | ------- | --------------------- |
| Docker  | Latest  | Container runtime     |
| Ansible | 2.14+   | Deployment automation |
| Bun     | ≥1.0    | Build tool            |

---

## Deployment Options

### Option 1: Automatic (Watchtower)

Recommended for **production** — containers auto-update when new images are pushed.

**Flow:**

1. Push code to `main`
2. GitHub Actions builds and pushes image to GHCR
3. Watchtower detects new tag and updates container

### Option 2: Manual (Ansible)

Recommended for **controlled updates** — full control over when updates happen.

---

## Step-by-Step: Manual Deployment

### Step 1: Prepare Environment

On your **local machine**:

```bash
# Navigate to project
cd Project-Shisha

# Ensure dependencies are installed
bun install

# Test build locally (optional but recommended)
bun run build:fuel-advisor-bot
```

### Step 2: Configure Deployment

Update the app's `deploy.vars.yml` if needed:

```yaml
# apps/fuel-advisor-bot/deploy.vars.yml
app_name: fuel-advisor-bot
container_name: fuel-advisor-bot
image_repository: ghcr.io/your-username/fuel-advisor-bot
image_tag: latest
app_port: 3000
host_port: 3001
watchtower_enabled: true
restart_policy: unless-stopped
```

### Step 3: Build and Push Image

**Option A: Via GitHub Actions**

Push to `main` branch — CI will build and push automatically.

**Option B: Locally**

```bash
# Build image
docker build -t ghcr.io/your-username/fuel-advisor-bot:latest \
  -f apps/fuel-advisor-bot/Dockerfile \
  apps/fuel-advisor-bot/

# Push to registry
docker push ghcr.io/your-username/fuel-advisor-bot:latest
```

### Step 4: Run Ansible Playbook

```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy-app.yml \
  -e "app_path=apps/fuel-advisor-bot"
```

### Step 5: Verify Deployment

```bash
# Check container status
docker ps

# Check logs
docker logs fuel-advisor-bot

# Test endpoint (if applicable)
curl http://localhost:3001/health
```

---

## Step-by-Step: Adding a New Application

### Step 1: Create Application Structure

```bash
mkdir -p apps/new-app/src
cd apps/new-app
```

### Step 2: Create Required Files

Copy from existing app template:

- `package.json`
- `Dockerfile`
- `Dockerfile.optimized`
- `compose.yml`
- `.env.example`
- `deploy.vars.yml`
- `README.md`

### Step 3: Update Root package.json

Add scripts:

```json
{
  "scripts": {
    "dev:new-app": "bun run --cwd apps/new-app dev",
    "build:new-app": "bun run --cwd apps/new-app build",
    "test:new-app": "bun run --cwd apps/new-app test"
  }
}
```

### Step 4: Create CI Workflow

Copy `.github/workflows/app-ci.yml` to `.github/workflows/new-app-ci.yml`

### Step 5: Deploy

```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy-app.yml \
  -e "app_path=apps/new-app"
```

---

## Rollback Procedure

If something goes wrong:

```bash
# Rollback to previous version
ansible-playbook ansible/playbooks/rollback-app.yml \
  -e "app_path=apps/fuel-advisor-bot" \
  -e "previous_tag=abc123"
```

Or manually:

```bash
# Pull previous tag
docker pull ghcr.io/your-username/fuel-advisor-bot:previous-tag

# Recreate container
docker stop fuel-advisor-bot
docker rm fuel-advisor-bot
docker run -d --name fuel-advisor-bot \
  --restart unless-stopped \
  ghcr.io/your-username/fuel-advisor-bot:previous-tag
```

---

## Docker Compose Quick Reference

### Start services

```bash
cd apps/fuel-advisor-bot
docker compose up -d
```

### Stop services

```bash
docker compose down
```

### View logs

```bash
docker compose logs -f
```

### Rebuild

```bash
docker compose build
docker compose up -d
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.

---

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — Design decisions
- [Contributing](../CONTRIBUTING.md) — Development guidelines
- [Watchtower config](../infra/compose/watchtower.yml) — Auto-update settings
