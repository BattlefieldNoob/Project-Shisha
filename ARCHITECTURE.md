# Architecture Documentation

> Design decisions and rationale for Project Shisha.

## Overview

Project Shisha is a **Bun workspaces monorepo** designed for **predictability** and **agent-friendliness**. The architecture prioritizes simplicity, minimal duplication, and clear boundaries between applications and infrastructure.

---

## Core Design Principles

### 1. Single Source of Truth per Domain

Each application owns its deployment configuration. There\'s no shared "deploy config" that multiple apps depend on. This reduces coupling and makes changes predictable.

### 2. Convention Over Configuration

Every app follows the same structure:

- Same mandatory files (`Dockerfile`, `compose.yml`, etc.)
- Same naming patterns
- Same deployment flow

Agents can make changes without guessing conventions.

### 3. Centralized Shared Services

Infrastructure services (Watchtower, Traefik, networks) live in `infra/` and are shared across all apps. Apps don\'t define their own Watchtower instances.

### 4. Two-Tier Docker Strategy

| Strategy      | Image                             | Use Case                  |
| ------------- | --------------------------------- | ------------------------- |
| **Safe**      | Full Bun runtime (~150MB)         | Development, complex deps |
| **Optimized** | Compiled binary on Alpine (~10MB) | Production, stable apps   |

---

## NX Build Orchestration

Project Shisha uses **NX** alongside Bun workspaces for enhanced build orchestration, caching, and dependency graph visualization.

### Why NX?

NX provides several benefits for our monorepo:

1. **Intelligent Build Caching** - Skip builds/tests for unchanged code
2. **Affected Commands** - Only rebuild/test changed projects and their dependencies
3. **Project Graph Visualization** - Visualize dependencies between apps and packages
4. **Remote Caching** - Share build cache across CI/CD pipelines
5. **Task Orchestration** - Automatic topological ordering of builds

### NX Configuration

```json
// nx.json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": ["{workspaceRoot}/bun.lock"],
    "production": ["!{projectRoot}/**/*.spec.ts", "..."]
  },
  "targetDefaults": {
    "build": { "dependsOn": ["^build"], "cache": true },
    "test": { "cache": true },
    "lint": { "cache": true }
  },
  "defaultBase": "main"
}
```

### Project Structure

```
project-shisha/
├── nx.json                    # Workspace-level NX config
├── apps/
│   ├── fuel-advisor-bot/
│   │   └── project.json       # NX project config
│   └── tablo-crawler/
│       └── project.json       # NX project config
├── packages/
│   ├── shared-lib/
│   │   └── project.json       # Library project config
│   └── shared-config/
│       └── project.json       # Config library project
└── .nx/
    ├── build.json             # Shared build configuration
    ├── test.json              # Shared test configuration
    └── lint.json              # Shared lint configuration
```

### NX Commands

```bash
# Run commands across all projects
npm run nx:build              # Build all projects
npm run nx:test               # Test all projects
npm run nx:lint               # Lint all projects
npm run nx:typecheck          # TypeScript check all projects

# Run commands for affected projects only (changed since main)
npm run nx:build:affected     # Build affected projects
npm run nx:test:affected       # Test affected projects
npm run nx:lint:affected       # Lint affected projects

# Show and explore
npm run nx:graph              # Open project graph visualization
npm run nx:show:projects       # List all projects
npm run nx:affected            # Show affected projects

# Cache management
npm run nx:reset               # Clear local cache
npm run nx:daemon              # Start NX daemon for faster execution
```

### Dependencies Between Projects

```
shared-config (config library)
        ↓
shared-lib (utilities library) ←── fuel-advisor-bot (app)
        ↓                              ↓
        └─────────── tablo-crawler (app)
```

The `implicitDependencies` in each app\'s `project.json` ensures proper build ordering.

### Remote Caching (Optional)

To enable remote caching with Nx Cloud:

1. Create an account at [nx.app](https://nx.app)
2. Connect your workspace:

```bash
npx nx connect-to-nx-cloud
```

3. Set `NX_CLOUD_ACCESS_TOKEN` secret in GitHub Actions

For self-hosted caching, configure in `nx.json`:

```json
{
  "remoteCache": {
    "url": "https://your-cache-server.com",
    "auth": "your-auth-token"
  }
}
```

### CI/CD Integration

NX automatically caches build outputs and skips unchanged tasks. Example workflow:

```yaml
# .github/workflows/nx-ci.yml
- name: Install dependencies
  run: bun install --frozen-lockfile

- name: Type check affected
  run: nx affected --target=typecheck --parallel=3

- name: Test affected
  run: nx affected --target=test --parallel=3

- name: Build affected
  run: nx affected --target=build --parallel=3
```

---

## Architecture Decisions

### Decision 1: Bun Workspaces with NX

**Rationale:** Bun workspaces handle package management and dependency resolution. NX enhances the development experience with intelligent caching, affected project detection, and build orchestration. The combination provides:

- **Bun**: Fast installs, workspace dependency management
- **NX**: Build caching, affected commands, task orchestration, project graph

This hybrid approach gives us the best of both worlds without sacrificing the simplicity that makes the monorepo agent-friendly.

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
- `project.json` — NX project configuration
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

`Push main → GitHub Actions → NX CI → Build image → Push to GHCR → Watchtower updates`

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
