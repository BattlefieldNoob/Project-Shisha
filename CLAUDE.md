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

## NX Build Orchestration

This project uses **NX** for build orchestration, caching, and affected project detection. NX works alongside Bun workspaces.

### Key NX Commands

```bash
# Build all projects (respects dependency order)
npm run nx:build

# Build only affected projects (changes since main)
npm run nx:build:affected

# Test all/affected projects
npm run nx:test
npm run nx:test:affected

# Lint all/affected projects
npm run nx:lint
npm run nx:lint:affected

# TypeScript check all/affected projects
npm run nx:typecheck
npm run nx:typecheck:affected

# Visualize project graph
npm run nx:graph

# List all projects
npm run nx:show:projects

# Clear cache
npm run nx:reset
```

### Project Dependencies

```
shared-config → shared-lib → fuel-advisor-bot
                            → tablo-crawler
```

When using `nx affected`, NX automatically determines which projects need rebuilding based on source changes and their dependencies.

## Development Setup

### Prerequisites

- Bun 1.0+ or Node.js 18+
- NX CLI (installed as dev dependency)

### Quick Start

```bash
# Install dependencies
bun install

# Run development mode
bun run dev:fuel-advisor-bot
bun run dev:tablo-crawler

# Build all projects with NX (caches results)
npm run nx:build

# Build only changed projects
npm run nx:build:affected
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
   npm run nx:build:affected
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
npm run nx:test

# Test only affected projects
npm run nx:test:affected

# Test specific project
npx nx test fuel-advisor-bot
```

## Remote Caching (Optional)

To enable remote caching with Nx Cloud:

1. Connect: `npx nx connect-to-nx-cloud`
2. Set `NX_CLOUD_ACCESS_TOKEN` in GitHub Actions

This allows build cache to be shared across machines and CI pipelines.
