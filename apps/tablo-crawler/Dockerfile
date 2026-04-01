FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY src/ ./src/

RUN bun install

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]