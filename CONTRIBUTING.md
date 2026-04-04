# Contributing to Project Shisha

> The messenger that watches and reports.

Thank you for your interest in contributing to Project Shisha. This document outlines the development guidelines and conventions that ensure consistency across the monorepo.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Coding Conventions](#coding-conventions)
- [Git Workflow](#git-workflow)
- [Testing Requirements](#testing-requirements)
- [Docker & Deployment](#docker--deployment)
- [Adding New Applications](#adding-new-applications)

---

## Development Environment Setup

### Prerequisites

| Tool    | Version | Purpose                     |
| ------- | ------- | --------------------------- |
| Bun     | ≥1.0    | Runtime and package manager |
| Node.js | ≥18     | Runtime environment         |
| Docker  | Latest  | Containerization            |
| Ansible | 2.14+   | Deployment automation       |

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/BattlefieldNoob/Project-Shisha.git
cd Project-Shisha

# Install dependencies for all workspaces
bun install

# Verify installation
bun run test:fuel-advisor-bot
bun run test:tablo-crawler
```

### Running Applications Locally

```bash
# Fuel Advisor Bot
bun run dev:fuel-advisor-bot

# Tablo Crawler
bun run dev:tablo-crawler
```

---

## Project Structure

This is a **Bun workspaces monorepo** with the following organization:

```
project-shisha/
├── apps/                    # Application code (mandatory structure)
│   ├── fuel-advisor-bot/    # Telegram bot for fuel prices
│   └── tablo-crawler/       # Web crawler application
├── packages/                # Shared libraries (optional)
├── docker/                  # Base images and shared scripts
├── infra/                   # Shared infrastructure
│   └── compose/            # Docker Compose for shared services
├── ansible/                 # Deployment automation
├── .github/workflows/       # CI/CD pipelines
└── .clinerules/            # AI agent guidelines
```

### Mandatory Files Per Application

Every app in `apps/` **must** include:

| File                   | Purpose                          |
| ---------------------- | -------------------------------- |
| `README.md`            | Application documentation        |
| `package.json`         | Dependencies and scripts         |
| `Dockerfile`           | Standard container (Bun runtime) |
| `Dockerfile.optimized` | Optimized container (compiled)   |
| `compose.yml`          | Docker Compose configuration     |
| `.env.example`         | Environment variables template   |
| `deploy.vars.yml`      | Deployment metadata              |

---

## Coding Conventions

### TypeScript Standards

- Use strict TypeScript with explicit types for public APIs
- Prefer `interface` over `type` for object shapes
- Use `const` over `let`; avoid mutable state where possible

### Naming Conventions

| Element    | Convention            | Example           |
| ---------- | --------------------- | ----------------- |
| Files      | lowercase-with-dashes | `fuel-scraper.ts` |
| Functions  | camelCase             | `getFuelPrices()` |
| Classes    | PascalCase            | `FuelService`     |
| Constants  | UPPER_SNAKE_CASE      | `MAX_RETRY_COUNT` |
| Interfaces | PascalCase            | `FuelPrice`       |

### Code Style

```typescript
// ✅ Preferred: Explicit types, pure functions
interface FuelStation {
  name: string;
  price: number;
}

function calculateAverage(prices: FuelStation[]): number {
  if (prices.length === 0) return 0;
  const sum = prices.reduce((acc, station) => acc + station.price, 0);
  return sum / prices.length;
}
```

### Logging

- Use `console.error` for failures and errors
- Use `console.log` for debug output
- Include context: `{ operation: 'fetch-prices', station: 'ENI', attempt: 3 }`

---

## Git Workflow

### Branch Naming

```
<type>/<issue-number>-<short-description>
```

**Types:**

- `feature/` - New functionality
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation only
- `chore/` - Maintenance tasks

**Examples:**

- `feature/123-add-fuel-history`
- `fix/456-telegram-connection-timeout`

### Commit Messages

```
<type>(<scope>): <subject>

<body>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`

**Example:**

```
feat(fuel-scraper): add MIMIT API integration

Add fuel price scraping from MIMIT public API with retry logic.
Implemented rate limiting to respect API quotas.
```

---

## Testing Requirements

### Test Structure

- Use `bun test` as the test runner
- Place tests alongside source files with `.test.ts` extension
- Coverage target: **≥80%** for new code

---

## Docker & Deployment

### Dockerfile Strategy

| Strategy      | File                   | Use When                                 |
| ------------- | ---------------------- | ---------------------------------------- |
| **Safe**      | `Dockerfile`           | App in development, complex dependencies |
| **Optimized** | `Dockerfile.optimized` | Stable app, minimal image size           |

### Deploy via Ansible

```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy-app.yml \
  -e "app_path=apps/fuel-advisor-bot"
```

### Watchtower

- Runs globally in `infra/compose/watchtower.yml`
- Apps need label `com.centurylinklabs.watchtower.enable: "true"` in `compose.yml`

---

## Adding New Applications

### Step 1: Create Application Structure

```bash
mkdir -p apps/new-app/src
```

### Step 2: Create Mandatory Files

Create following existing patterns:

- `package.json` - Use workspace naming
- `Dockerfile` / `Dockerfile.optimized` - Copy from existing app
- `compose.yml` - Adjust ports/labels
- `.env.example` / `deploy.vars.yml`

### Step 3: Update Root package.json

Add workspace scripts for dev/build/test.

### Step 4: Create CI Workflow

Copy existing workflow and adjust.

---

## Questions?

- See [README.md](./README.md) for project overview
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions

---

_Last updated: 2026-04-04_
