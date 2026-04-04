# Deployment Flow

## Overview

This document describes the deployment process for applications in the "Project Shisha" monorepo.

## Deployment Process

1. Push to main branch
2. GitHub Actions builds the image and pushes to registry
3. The server has the app container running
4. Watchtower detects the new tag and updates only containers with label enabled

## CI/CD Configuration

The CI/CD pipeline uses GitHub Actions with the following workflows:

- `fuel-advisor-bot-ci.yml`: Builds and pushes image for fuel-advisor-bot
- `tablo-crawler-ci.yml`: Builds and pushes image for tablo-crawler
- `deploy-manual.yml`: Manual deployment workflow

## Watchtower Configuration

Watchtower runs globally in the infrastructure with `--label-enable` flag, which means it only updates containers that are explicitly labeled for updates.
