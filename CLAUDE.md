# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the "Project Shisha" monorepo structure for Bun/Node applications with Docker, Ansible, and Watchtower. The repository contains two main applications:

1. `apps/fuel-advisor-bot/` - A Telegram bot that provides fuel price recommendations and advice
2. `apps/tablo-crawler/` - A crawler application

## Development Setup

### Prerequisites
- Bun 1.0 or higher
- Node.js 18 or higher

### Common Commands

```bash
# Install dependencies for all workspaces
bun install

# Run development mode for specific apps
bun run dev:fuel-advisor-bot
bun run dev:tablo-crawler

# Build applications
bun run build:fuel-advisor-bot
bun run build:tablo-crawler

# Run tests
bun run test:fuel-advisor-bot
bun run test:tablo-crawler
```

## Project Structure

- `apps/` - Contains the application code
  - `fuel-advisor-bot/` - Telegram bot for fuel price tracking
  - `tablo-crawler/` - Crawler application
- `packages/` - Shared libraries or configurations
- `docker/` - Base images and shared scripts
- `infra/` - Machine stack and operational documentation
- `ansible/` - Provisioning and deployment
- `.github/workflows/` - CI/CD workflows

## Key Technologies

- **Bun** - JavaScript runtime and package manager
- **Node.js** - Runtime environment
- **Telegram Bot API** - For the fuel advisor bot
- **SQLite** - Database for storing fuel data
- **Docker** - Containerization
- **Ansible** - Deployment automation
- **Watchtower** - Container update monitoring

## Application Details

### Fuel Advisor Bot (`apps/fuel-advisor-bot`)
- Uses `node-telegram-bot-api` for Telegram integration
- Scrapes fuel prices from MIMIT (Italian fuel price database)
- Stores data in a local SQLite database
- Features include:
  - Real-time fuel price tracking
  - Location-based recommendations
  - Price comparison across stations
  - User-friendly chat interface

### Tablo Crawler (`apps/tablo-crawler`)
- A simple crawler application
- Uses Bun for execution
- Dockerized for deployment

## Deployment

Both applications follow a consistent deployment pattern:
1. Update `deploy.vars.yml` with configuration
2. Build the Docker image:
   ```bash
   docker build -t <app-name> .
   ```
3. Deploy using Ansible:
   ```bash
   ansible-playbook -i ansible/inventories/production/hosts.ini ansible/playbooks/deploy-app.yml
   ```

## Environment Variables

Each application has its own `.env.example` file that should be copied to `.env` and updated with appropriate values.

## Testing

Each application has a test script defined in its package.json:
- `bun run test` in the app directory