# Project Shisha (使者)
> The messenger that watches and reports.

This is the "Project Shisha" monorepo structure for Bun/Node applications with Docker, Ansible, and Watchtower.

## Repo contract

- Le app vivono in `apps/`.
- Ogni app deve avere `Dockerfile`, `Dockerfile.optimized`, `compose.yml`, `.env.example`, `deploy.vars.yml`.
- I servizi condivisi vivono in `infra/compose/`.
- Il deploy Ansible comune vive in `ansible/roles/app_deploy/`.
- Watchtower esiste una sola volta, in `infra/compose/watchtower.yml`.
- La strategia runtime dell'app è dichiarata in `deploy.vars.yml`.

## Structure

- `apps/` - Contains the application code
- `packages/` - Shared libraries or configurations
- `docker/` - Base images and shared scripts
- `infra/` - Machine stack and operational documentation
- `ansible/` - Provisioning and deployment
- `.github/workflows/` - CI/CD workflows

## Applications

- `apps/fuel-advisor-bot/` - Fuel advisor bot application
- `apps/tablo-crawler/` - Tablo crawler application