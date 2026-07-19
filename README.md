# md-mcp: Madhyasth Darshan MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives Claude access to the Madhyasth Darshan library — books, full-text and semantic search, and the paribhasha (lexicon of philosophical terminology).

## Use it with Claude (no setup required)

The server is hosted as a remote MCP server. Any Claude user (Pro, Max, Team, or Enterprise) can add it as a custom connector:

1. Go to [claude.ai](https://claude.ai) → **Settings** → **Connectors**
2. Click **Add custom connector**
3. Enter the URL: `https://md-mcp.achal.xyz/mcp`
4. No authentication is required — just save.

Once added, the connector is available in the Claude mobile and desktop apps on the same account. Enable it in a chat and ask Claude about Madhyasth Darshan — it can browse books, look up definitions, and search the knowledge base.

## Tools

| Tool | Description |
|------|-------------|
| `list_books` | List all published books in the library |
| `get_book_page` | Read a specific page of a book |
| `get_book_toc` | Get a book's hierarchical table of contents |
| `lexical_search_books` | Full-text search across books (paginated, exact word matches) |
| `semantic_search` | Meaning-based search across the knowledge base (Agentset) |
| `lookup_paribhasha` | Look up definitions of Madhyasth Darshan terms (Hindi or Hinglish) |

## Self-hosting

### Local (stdio) — e.g. Claude Desktop

```bash
pnpm install
cp .env.placeholder .env   # fill in your Agentset credentials
pnpm run build
```

Then point your MCP client at `node build/index.js`, or install the package and use the `madhyasth` command.

Only `semantic_search` needs Agentset credentials (`AGENTSET_API_KEY`, `AGENTSET_NAMESPACE_ID` from [agentset.ai](https://agentset.ai)); the other tools use the public Madhyasth Darshan API.

### Remote (Streamable HTTP) — Docker

The repo includes a `Dockerfile` that runs the server in Streamable HTTP mode on port 3000 (`/mcp` endpoint, `/health` for health checks):

```bash
docker build -t md-mcp .
docker run -p 3000:3000 \
  -e AGENTSET_API_KEY=... \
  -e AGENTSET_NAMESPACE_ID=... \
  md-mcp
```

Credentials are injected at runtime via environment variables — no secrets are baked into the image. Deploy behind any HTTPS reverse proxy (Coolify, Caddy, Traefik, etc.); Claude custom connectors require HTTPS.

### Development

```bash
pnpm run dev        # build + launch MCP Inspector (stdio)
pnpm run start:http # run the HTTP server locally on :3000
```

## Architecture

- `src/server.ts` — `createServer()`: registers the 6 tools (shared by both transports)
- `src/index.ts` — stdio entry point (local/Claude Desktop)
- `src/http.ts` — Streamable HTTP entry point (remote/connector)
- `src/api.ts` — Madhyasth Darshan REST API client (`https://db.madhyasth.org/api/v1`)
- `src/agentset.ts` — Agentset semantic search
- `src/paribhasha.ts` — bundled lexicon lookup (`paribhasha.json`)
- `src/config.ts` — credentials from `process.env`, falling back to a bundled `.env`
