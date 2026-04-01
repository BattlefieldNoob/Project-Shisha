# Fuel Advisor Bot

A smart bot that provides fuel price recommendations and advice.

## Features

- Real-time fuel price tracking
- Location-based recommendations
- Price comparison across stations
- User-friendly chat interface

## Getting Started

### Prerequisites

- Bun 1.0 or higher
- Node.js 18 or higher

### Installation

```bash
# Install dependencies
bun install
```

### Running the Bot

```bash
# Development mode
bun run dev

# Build for production
bun run build
```

### Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

## Deployment

This bot can be deployed using the existing infrastructure:

1. Update `deploy.vars.yml` with your configuration
2. Build the Docker image:
   ```bash
   docker build -t fuel-advisor-bot .
   ```
3. Deploy using Ansible:
   ```bash
   ansible-playbook -i ansible/inventories/production/hosts.ini ansible/playbooks/deploy-app.yml
   ```

## Project Structure

```
apps/fuel-advisor-bot/
├── src/
│   └── index.ts          # Main entry point
├── public/               # Static assets
├── compose.yml           # Docker Compose configuration
├── deploy.vars.yml       # Deployment variables
├── Dockerfile            # Standard Dockerfile
├── Dockerfile.optimized  # Optimized Dockerfile
├── .env.example          # Environment variables example
└── README.md             # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.