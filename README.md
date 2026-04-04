# Project Shisha (使者)

> The messenger that watches and reports.

This is the "Project Shisha" monorepo structure for Bun/Node applications with Docker, Ansible, and Watchtower.

## Quick Start

```bash
# Install dependencies
bun install

# Run development
bun run dev:fuel-advisor-bot
bun run dev:tablo-crawler
```

---

## Repository Contract

- **Apps live in `apps/`** — Each app is self-contained
- **Required files per app:** `Dockerfile`, `Dockerfile.optimized`, `compose.yml`, `.env.example`, `deploy.vars.yml`
- **Shared services in `infra/compose/`** — Watchtower, reverse proxy
- **One global Watchtower** in `infra/compose/watchtower.yml` with label-based selection
- **Docker strategy** declared in `deploy.vars.yml`

---

## Project Structure

```
project-shisha/
├── apps/
│   ├── fuel-advisor-bot/     # Telegram bot for fuel prices
│   │   ├── src/              # Application source
│   │   ├── Dockerfile        # Safe (Bun runtime)
│   │   ├── Dockerfile.optimized  # Optimized (compiled)
│   │   ├── compose.yml       # Container config
│   │   └── deploy.vars.yml  # Deployment metadata
│   └── tablo-crawler/        # Web crawler
├── packages/                  # Shared libraries
├── docker/                    # Base images & scripts
├── infra/                     # Shared infrastructure
│   ├── compose/              # Docker stack (watchtower, etc)
│   └── docs/                 # Infra documentation
├── ansible/                   # Deployment automation
│   └── roles/app_deploy/     # Single parameterized role
├── .github/workflows/         # CI/CD pipelines
├── .clinerules/              # AI agent guidelines
├── CONTRIBUTING.md           # Development guidelines
├── ARCHITECTURE.md           # Design decisions
└── CLAUDE.md                 # AI context file
```

---

## Applications

### Fuel Advisor Bot

Telegram bot for fuel price tracking from MIMIT API.

**Run:** `bun run dev:fuel-advisor-bot`

**Deploy:**
```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy-app.yml \
  -e "app_path=apps/fuel-advisor-bot"
```

### Tablo Crawler

Web crawler for restaurant/monitoring data.

**Run:** `bun run dev:tablo-crawler`

---

## Docker Strategies

| Strategy | Use When |
|----------|----------|
| `Dockerfile` (safe) | Development, complex deps |
| `Dockerfile.optimized` | Stable app, minimal image |

Set via `deploy.vars.yml`: `dockerfile_strategy: safe`

---

## Documentation

| File | Purpose |
|------|---------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development guidelines |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Design decisions |
| [CLAUDE.md](./CLAUDE.md) | AI agent context |
| [bun-monorepo-blueprint.md](./bun-monorepo-blueprint.md) | Original blueprint |

---

## License: MIT