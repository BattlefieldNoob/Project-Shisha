# Fuel Advisor Bot - Dockerfile (Safe Strategy - Full Bun Runtime)
FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/

# Copy public assets
COPY public/ ./public/

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/index.ts"]
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "run", "start"]