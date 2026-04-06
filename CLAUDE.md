# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the "Project Shisha" monorepo structure for Bun/Node applications with Docker, Ansible, and NX build orchestration. The repository contains:

### Applications
1. `apps/fuel-advisor-bot/` - Telegram bot for fuel price recommendations
2. `apps/tablo-crawler/` - Crawler application

### Shared Packages
3. `packages/shared-lib/` - Shared utilities and helpers
4. `packages/shared-config/` - Shared ESLint and TypeScript configurations

## Bun Usage (Required)

**Always use `bun`** for all package management and script execution:

- Use `bun run` instead of `npm run`, `npx`, or `yarn`
- Use `bun x` instead of `npx` for one-off commands
- Use `bun add` instead of `npm install`
- Use `bun pm ls` for listing dependencies

## NX Build Orchestration

This project uses **NX** for build orchestration, caching, and affected project detection. NX works alongside Bun workspaces.

### Key NX Commands

```bash
# Build all projects (respects dependency order)
bun run nx:build

# Build only affected projects (changes since main)
bun run nx:build:affected

# Test all/affected projects
bun run nx:test
bun run nx:test:affected

# Lint all/affected projects
bun run nx:lint
bun run nx:lint:affected

# TypeScript check all/affected projects
bun run nx:typecheck
bun run nx:typecheck:affected

# Visualize project graph
bun run nx:graph

# List all projects
bun run nx:show:projects

# Clear cache
bun run nx:reset
```

### Project Dependencies

```
shared-config -> shared-lib -> fuel-advisor-bot
                            -> tablo-crawler
```

When using `nx affected`, NX automatically determines which projects need rebuilding based on source changes and their dependencies.

## Development Setup

### Prerequisites

- Bun 1.0+
- NX CLI (installed as dev dependency)

### Quick Start

```bash
# Install dependencies
bun install

# Run development mode
bun run dev:fuel-advisor-bot
bun run dev:tablo-crawler

# Build all projects with NX (caches results)
bun run nx:build

# Build only changed projects
bun run nx:build:affected
```

## Project Structure

```
project-shisha/
├── nx.json                    # NX workspace configuration
├── apps/
│   ├── fuel-advisor-bot/
│   │   ├── project.json       # NX project config
│   │   └── ...
│   └── tablo-crawler/
│       ├── project.json       # NX project config
│       └── ...
├── packages/
│   ├── shared-lib/
│   │   └── project.json       # Library project config
│   └── shared-config/
│       └── project.json       # Config library project
└── .nx/                       # Shared NX configurations
```

## Key Technologies

- **Bun** - JavaScript runtime and package manager
- **NX** - Build orchestration and caching
- **Node.js** - Runtime environment
- **Docker** - Containerization
- **Ansible** - Deployment automation
- **Watchtower** - Container update monitoring

## Deployment

Both applications follow a consistent deployment pattern:

1. Update `deploy.vars.yml` with configuration
2. Build with NX (uses cache):
   ```bash
   bun run nx:build:affected
   ```
3. Deploy using Ansible:
   ```bash
   ansible-playbook -i ansible/inventories/production/hosts.ini ansible/playbooks/deploy-app.yml
   ```

## Environment Variables

Each application has its own `.env.example` file that should be copied to `.env` and updated with appropriate values.

## Testing

```bash
# Test all projects (cached)
bun run nx:test

# Test only affected projects
bun run nx:test:affected

# Test specific project
bun x nx test fuel-advisor-bot
```

## Remote Caching (Optional)

To enable remote caching with Nx Cloud:

1. Connect: `bun x nx connect-to-nx-cloud`
2. Set `NX_CLOUD_ACCESS_TOKEN` in GitHub Actions

This allows build cache to be shared across machines and CI pipelines.
