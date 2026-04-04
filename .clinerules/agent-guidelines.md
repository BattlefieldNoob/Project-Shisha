# AI Agent Guidelines

> Guidelines for AI agents working with Project Shisha.

## Agent Context

This is a **Bun workspaces monorepo** with 2 applications:

- `apps/fuel-advisor-bot` — Telegram fuel price bot
- `apps/tablo-crawler` — Web crawler

The architecture prioritizes **predictability** and **agent-friendliness**.

---

## Quick Reference

### Required Files Per App

Every app in `apps/` MUST have:

- `Dockerfile` — Safe strategy (Bun runtime)
- `Dockerfile.optimized` — Optimized (compiled binary)
- `compose.yml` — Container config
- `.env.example` — Environment template
- `deploy.vars.yml` — Deployment metadata

### Key Paths

| Path                        | Purpose                |
| --------------------------- | ---------------------- |
| `apps/<app>/`               | Application source     |
| `infra/compose/`            | Shared Docker services |
| `ansible/roles/app_deploy/` | Deployment role        |
| `.github/workflows/`        | CI/CD pipelines        |

---

## Agent Workflow

### Before Making Changes

1. **Read the architecture** — Check ARCHITECTURE.md first
2. **Check existing patterns** — Look at similar files in other apps
3. **Identify the scope** — Which app? Which files?

### Common Tasks

#### Run an app locally

```bash
bun run dev:fuel-advisor-bot
bun run dev:tablo-crawler
```

#### Build an app

```bash
bun run build:fuel-advisor-bot
bun run build:tablo-crawler
```

#### Deploy an app

```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy-app.yml \
  -e "app_path=apps/fuel-advisor-bot"
```

#### Add a new app

1. Create `apps/new-app/` with required files
2. Add scripts to root `package.json`
3. Create CI workflow in `.github/workflows/`
4. Add entry to README.md

---

## Important Conventions

### File Naming

- Files: `lowercase-with-dashes.ts`
- Classes: `PascalCase`
- Functions: `camelCase`

### Docker Strategy

- Default: `Dockerfile` (safe strategy)
- Set via `deploy.vars.yml`: `dockerfile_strategy: safe`

### Watchtower

- Runs globally in `infra/compose/watchtower.yml`
- Apps opt-in with label: `com.centurylinklabs.watchtower.enable: "true"`

### Environment Variables

- Templates in `.env.example` (committed)
- Actual values in `.env` (gitignored)
- Production on server only

---

## What NOT To Do

- Don't create separate Watchtower instances per app
- Don't hardcode deployment values — use `deploy.vars.yml`
- Don't duplicate configs — reference shared ones in `infra/`
- Don't commit secrets to `.env` files

---

## Available Documentation

| File                                  | Description      |
| ------------------------------------- | ---------------- |
| [README.md](../README.md)             | Project overview |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Dev guidelines   |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Design decisions |
| [CLAUDE.md](../CLAUDE.md)             | AI context       |

---

_For agents: Always prefer explicit conventions over implicit knowledge._
