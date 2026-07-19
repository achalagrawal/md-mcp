# md-mcp: Madhyasth Darshan MCP server (Streamable HTTP mode)
FROM node:24-slim AS build

WORKDIR /app

# Install pnpm (project's package manager)
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Build the TypeScript sources.
# The build script copies .env into build/, but we don't ship secrets in the
# image — provide a placeholder so the copy step succeeds. Real Agentset
# credentials are injected at runtime via environment variables from compose.
COPY . .
RUN touch .env && pnpm run build

# --- Runtime image ---
FROM node:24-slim AS runtime

# curl is needed for container health checks (e.g. Coolify's HTTP healthcheck)
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
ENV MCP_HTTP_PORT=3000

# Copy only what's needed to run
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

# Run the HTTP entry point (not stdio)
CMD ["node", "build/http.js"]
