# Base stage for both Bun and Node.js
FROM alpine:3.14 AS base
WORKDIR /app
COPY package.json .

# Bun stage
FROM oven/bun:1 AS bun-builder
USER bun
WORKDIR /app
COPY --from=base /app/package.json .
COPY . .
RUN bun install
RUN ADAPTER=bun bun run build

# Final Bun image
FROM oven/bun:1-alpine AS bun
WORKDIR /app
COPY --from=bun-builder /app/build /app/build
COPY --from=bun-builder /app/node_modules /app/node_modules
EXPOSE 3000
USER bun
CMD ["bun", "build/index.js"]