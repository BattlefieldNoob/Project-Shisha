# Architecture Documentation

> Design decisions and rationale for Project Shisha.

## Overview

Project Shisha is a **Bun workspaces monorepo** designed for **predictability** and **agent-friendliness**. The architecture prioritizes simplicity, minimal duplication, and clear boundaries between applications and infrastructure.

---

## Core Design Principles

### 1. Single Source of Truth per Domain

Each application owns its deployment configuration. There's no shared "deploy config" that multiple apps depend on. This reduces coupling and makes changes predictable.

### 2. Convention Over Configuration

Every app follows the same structure:

- Same mandatory files (`Dockerfile`, `compose.yml`, etc.)
- Same naming patterns
- Same deployment flow

Agents can make changes without guessing conventions.

### 3. Centralized Shared Services

Infrastructure services (Watchtower, Traefik, networks) live in `infra/` and are shared across all apps. Apps don't define their own Watchtower instances.

### 4. Two-Tier Docker Strategy

| Strategy      | Image                             | Use Case                  |
| ------------- | --------------------------------- | ------------------------- |
| **Safe**      | Full Bun runtime (~150MB)         | Development, complex deps |
| **Optimized** | Compiled binary on Alpine (~10MB) | Production, stable apps   |

---

## Architecture Decisions

### Decision 1: Bun Workspaces (Not Nx)

**Rationale:** For 2 apps, Bun workspaces provide sufficient monorepo features without the overhead of Nx. Less complexity = easier for agents to understand and modify.

### Decision 2: One Global Watchtower

**Rationale:** Running multiple Watchtower instances creates race conditions. A single instance with `--label-enable` updates only containers that opt-in.

```yaml
# infra/compose/watchtower.yml
command: --label-enable --interval 60 --cleanup
```

### Decision 3: Parameterized Ansible Role

**Rationale:** A single `app_deploy` role reads `deploy.vars.yml` and renders the compose file. Benefits:

- Single point of change for deployment logic
- Differences between apps are data, not code
- Easy to add new apps

### Decision 4: Docker Strategy per App

Each app declares its strategy in `deploy.vars.yml`:

```yaml
dockerfile_strategy: safe # or "optimized"
```

### Decision 5: Environment Separation

- `.env.example` — Template for devs (committed)
- `.env` — Local dev (gitignored)
- `machine.env` — Production (on server only)

---

## Component Architecture

### Application Layer (`apps/`)

Each app contains:

- `src/` — Application source code
- Tests alongside source (`.test.ts`)
- `package.json` with workspace dependencies

### Infrastructure Layer (`infra/`)

Shared Docker services:

- Watchtower (global updates)
- Traefik (reverse proxy)
- Networks (app isolation)

### Deployment Layer (`ansible/`)

Deployment automation:

- `app_deploy` role (parameterized)
- `deploy-app.yml` playbook
- `rollback-app.yml` playbook

---

## Data Flow

### Development

`Code → bun run dev → Local execution`

### CI/CD

`Push main → GitHub Actions → Build image → Push to GHCR → Watchtower updates`

### Deployment

`Ansible → Read deploy.vars.yml → Render compose → docker compose up`

---

## Security

### Container Isolation

- Each app in own container
- Internal Docker network by default
- External access via Traefik

### Secrets

- Secrets in `.env` (gitignored)
- Production secrets on server only
- Never commit secrets

---

## Anti-Patterns to Avoid

1. **Shared deployment logic** — Each app owns its deploy config
2. **Multiple Watchtower instances** — Use one global with labels
3. **Implicit conventions** — Everything must be documented
4. **Hardcoded values** — Use `deploy.vars.yml`
5. **Duplicate configurations** — Reference shared configs

---

## References

- [Blueprint](./bun-monorepo-blueprint.md) — Original design
- [Contributing](./CONTRIBUTING.md) — Development guidelines
- [Deployment Flow](./infra/docs/deployment-flow.md) — CI/CD process
