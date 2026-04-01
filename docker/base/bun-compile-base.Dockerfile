FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build ./src/index.ts --compile --outfile app

FROM alpine:3.20 AS runtime
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/app /app/app
RUN chmod +x /app/app
USER app
EXPOSE 3000
CMD ["/app/app"]