# Fuel Advisor Bot - Dockerfile (Safe Strategy - Multi-stage with Bun Runtime)
# Uses full Bun runtime for maximum compatibility

# ============================================
# Stage 1: Base
# ============================================
FROM oven/bun:1 AS base
WORKDIR /app

# ============================================
# Stage 2: Dependencies
# ============================================
FROM base AS deps
COPY package.json ./
COPY bun.lock ./ 2>/dev/null || true
RUN bun install --frozen-lockfile --production || bun install --production

# ============================================
# Stage 3: Build (optional, for TypeScript)
# ============================================
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build || true

# ============================================
# Stage 4: Runtime - Slim Bun with non-root user
# ============================================
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY --from=build /app/dist ./dist 2>/dev/null || true
COPY src/ ./src/
COPY package.json ./

# Create data directory if needed
RUN mkdir -p data && chown -R app:app /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Health check - verify bot process is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD pgrep -f "src/index.ts" || pgrep -f "index.ts" || exit 1

# Start the application
CMD ["bun", "run", "src/index.ts"]