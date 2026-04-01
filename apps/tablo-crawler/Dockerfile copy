# Multi-stage Dockerfile optimized for ARM64 architecture
FROM --platform=linux/arm64 oven/bun:1.2.21-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build standalone executable for ARM64
RUN bun build --compile --minify --sourcemap --bytecode --target=bun-linux-arm64-musl ./src/index.ts --outfile=tablocrawler

# Production stage - minimal base image
FROM --platform=linux/arm64 alpine:3.19

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates libstdc++

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Create app directory and data directories
WORKDIR /app
RUN mkdir -p /app/data /app/config && \
    chown -R appuser:appgroup /app

# Copy compiled binary from builder stage
COPY --from=builder --chown=appuser:appgroup /app/tablocrawler /app/tablocrawler

# Make binary executable
RUN chmod +x /app/tablocrawler

# Switch to non-root user
USER appuser

# Create volumes for data persistence
VOLUME ["/app/data", "/app/config"]

# Set default environment variables
ENV USER_IDS_FILE_PATH="/app/data/monitored-users.txt"
ENV STATE_FILE_PATH="/app/data/monitoring-state.json"
ENV MONITORING_INTERVAL_SECONDS="60"
ENV DAYS_TO_SCAN="3"
ENV SEARCH_LATITUDE="45.408153"
ENV SEARCH_LONGITUDE="11.875273"
ENV SEARCH_RADIUS="4"

# Health check to ensure the application is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f tablocrawler || exit 1

# Set entrypoint to watch-users command
ENTRYPOINT ["/app/tablocrawler", "watch-users"]

# Default command arguments (can be overridden)
CMD ["--user-ids-file", "/app/data/monitored-users.txt", "--state-file", "/app/data/monitoring-state.json"]