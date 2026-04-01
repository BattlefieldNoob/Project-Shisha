# Fuel Advisor Bot - Dockerfile (Safe Strategy - Full Bun Runtime)
FROM oven/bun:1-slim

# Set working directory
WORKDIR /app

# Install only runtime deps using the app-local package manifest.
COPY package.json ./
RUN bun install --production

# Copy application source and runtime assets.
COPY src/ ./src/
COPY data/ ./data/

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/index.ts"]