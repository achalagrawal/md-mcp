# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# md-mcp: Madhyasth Darshan MCP Server

## Project Purpose

**md-mcp** is an MCP (Model Context Protocol) server that provides programmatic access to the Madhyasth Darshan library and knowledge base. It acts as a bridge between Claude AI and the Madhyasth Darshan REST API, exposing book content, full-text search, semantic search, and lexicon definitions as callable tools.

The project is designed for integration with Claude via the Model Context Protocol, allowing Claude to:
- Browse and read published books from the Madhyasth Darshan collection
- Search across book content with proximity-based matching
- Perform semantic search across a knowledge base using Agentset
- Look up word definitions and philosophical terminology (paribhasha)
- Navigate book structure via table of contents
- Access comprehensive information about books and their organization

This is a specialized knowledge access tool for exploring philosophical and spiritual texts within the Madhyasth Darshan tradition.

---

## High-Level Architecture

The MCP server follows a clean, four-layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│  MCP Server Layer (index.ts)                            │
│  - Registers 6 MCP tools with Zod validation            │
│  - Handles stdio transport for Claude integration       │
│  - Provides error handling and response formatting      │
└─────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┬───────────────┐
           ▼              ▼              ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  API Layer       │ │  Agentset    │ │ Lexicon  │ │  Config      │
│  (api.ts)        │ │  (agentset.ts│ │ (pariba- │ │  (config.ts) │
│                  │ │   config.ts) │ │  shash.ts│ │              │
│  - REST API      │ │  - Semantic  │ │  - Word  │ │  - Load .env │
│  - Book content  │ │    search    │ │    lookup│ │  - Agentset  │
│  - Full-text     │ │  - Agentset  │ │  - JSON  │ │    creds     │
│    search        │ │    client    │ │    cache │ │              │
└──────────────────┘ └──────────────┘ └──────────┘ └──────────────┘
         │                   │              │
         ▼                   ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│  Madhyasth API   │ │  Agentset    │ │ paribhasha   │
│  (REST)          │ │  Knowledge   │ │ .json        │
│                  │ │  Base        │ │              │
└──────────────────┘ └──────────────┘ └──────────────┘
```

### Data Flow

1. Claude sends tool invocation to MCP server (via stdio)
2. MCP server layer validates input with Zod
3. Tool handler calls appropriate function from api.ts or paribhasha.ts
4. For API calls: fetch data → transform → return
5. For lexicon: check cache → load if needed → search → return
6. Response serialized to JSON and sent back to Claude

---

## Key Files and Their Roles

### `/Users/achal/Code/md-mcp/src/server.ts` - Core MCP Server & Tool Registration
**Role:** `createServer()` factory shared by both transports

**Key Responsibilities:**
- Creates McpServer instance (name: "madhyasth-darshan", version: "1.0.0")
- Registers 6 MCP tools with Zod schema validation
- Handles errors gracefully with try-catch patterns
- Returns structured responses with `content` array and optional `isError` flag

**Registered Tools:**
1. `list_books` - No parameters, returns all available books
2. `get_book_page` - Parameters: book_id (required), page_no (optional, defaults to 1)
3. `get_book_toc` - Parameter: book_id (required)
4. `lexical_search_books` - Parameters: query (required), book_ids (optional, comma-separated), page (optional, defaults to 1)
5. `lookup_paribhasha` - Parameter: word (required, supports Hindi and Hinglish)
6. `semantic_search` - Parameters: query (required), topK (optional, 1-100, default 10), rerank (optional, boolean, default true)

**Pattern:** Each tool wraps an async function call in try-catch, returning standardized response objects

### `/Users/achal/Code/md-mcp/src/index.ts` - Stdio Entry Point
**Role:** Local/Claude Desktop entry point — connects the shared server to StdioServerTransport

### `/Users/achal/Code/md-mcp/src/http.ts` - Streamable HTTP Entry Point
**Role:** Remote entry point for the hosted connector (`https://md-mcp.achal.xyz/mcp`)

**Key Responsibilities:**
- Node http server on port 3000 (`MCP_HTTP_PORT` env var overrides)
- Stateless StreamableHTTPServerTransport — a fresh server+transport per request
- `/mcp` endpoint for MCP traffic, `/health` for health checks
- Permissive CORS + OPTIONS preflight for browser-based MCP clients
- Deployed via Docker (see `Dockerfile`) behind an HTTPS proxy (Coolify)

### `/Users/achal/Code/md-mcp/src/api.ts` - External API Integration
**Role:** Client for the JV Adhyaan REST API with response transformation

**Key Responsibilities:**
- Manages API endpoint: `https://db.madhyasth.org/api/v1`
- Type-safe interface definitions (Full and simplified versions)
- Generic `fetchApi<T>()` helper for HTTP requests
- Response transformation: strips unnecessary fields for Claude

**Interface Patterns:**
- `*Full` interfaces: Complete API response structures
- Regular interfaces: Simplified for Claude consumption (removes images, HTML, metadata)

**API Endpoints Used:**
- `GET /books/` - List all books
- `GET /books/{bookId}/pages/{pageNo}/` - Get specific page
- `GET /books/{bookId}/toc/` - Get table of contents
- `GET /search/?q={query}&highlight=false&book_ids={ids}` - Search with filters

**Transformation Examples:**
- `BookPageResponseFull` → `BookPageResponse` (removes html_content, tables, images)
- `SearchResultFull` → `SearchResult` (removes hard_pageno field)

### `/Users/achal/Code/md-mcp/src/config.ts` - Configuration Loader
**Role:** Loads Agentset credentials from .env file

**Key Responsibilities:**
- Reads and parses .env file from build directory
- Validates required configuration (API key, namespace ID)
- Exports typed configuration object
- Handles optional tenant ID for multi-tenancy

**Configuration Interface:**
```typescript
interface AgentsetConfig {
  apiKey: string;
  namespaceId: string;
  tenantId?: string;
}
```

**Validation:** Throws errors if API key or namespace ID are missing or contain placeholder values

### `/Users/achal/Code/md-mcp/src/agentset.ts` - Agentset Integration
**Role:** Semantic search using Agentset knowledge base

**Key Responsibilities:**
- Initializes Agentset client with credentials from config.ts
- Provides `searchKnowledgeBase()` function for semantic search
- Formats search results with metadata and content
- Implements singleton pattern for Agentset client initialization

**Search Options:**
- `topK`: Number of results to return (1-100, default 10)
- `rerank`: Whether to rerank by relevance (default true)

**Result Formatting:**
- Extracts metadata fields (book_title, book_id, page_no)
- Structures results with clear separators
- Returns human-readable formatted text

### `/Users/achal/Code/md-mcp/src/paribhasha.ts` - Lexicon Lookup
**Role:** Local word definition lookups with caching

**Key Responsibilities:**
- Loads paribhasha.json bundled during build
- Implements singleton pattern with `paribhashaCache`
- Case-insensitive search across hindi, hinglish, and key fields
- Returns array of matching entries

**Data Structure:**
```typescript
interface ParibhashaEntry {
  hindi: string;           // Hindi script term
  hinglish: string;        // Romanized/Latin transliteration
  pageno: number;          // Reference page in source text
  paribhasha: string[];    // Array of definitions/explanations
}
```

**Search Mechanism:** Substring matching on lowercase values - finds partial matches across all text fields

### `/Users/achal/Code/md-mcp/paribhasha.json` - Lexicon Data
**Role:** Bundled philosophical terminology database

**Structure:** JSON object mapping terms to definitions
- Example: `"समाधान"` (samadhan) → object with hindi, hinglish, page number, and definition array
- Contains 1000s of Madhyasth Darshan terminology entries
- Compiled into binary during build process

**Inclusion:** Copied to build/ directory during build step

### `/Users/achal/Code/md-mcp/.env` - Configuration File
**Role:** Stores Agentset API credentials

**Required Fields:**
- `AGENTSET_API_KEY` - Your Agentset API key from https://agentset.ai
- `AGENTSET_NAMESPACE_ID` - The namespace ID for your knowledge base

**Optional Fields:**
- `AGENTSET_TENANT_ID` - Tenant ID if using multi-tenancy features

**Important:** This file is copied to build/ directory during the build process and loaded at runtime

### `/Users/achal/Code/md-mcp/package.json` - Project Configuration
**Key Details:**
- **bin.madhyasth:** Executable installed as `madhyasth` command
- **dependencies:** 4 production deps (minimal footprint)
  - `@modelcontextprotocol/sdk` - MCP protocol implementation
  - `zod` - Input validation
  - `agentset` - Semantic search client
  - `node-fetch` - HTTP client for Agentset
- **devDependencies:** TypeScript tooling
- **Scripts:** `build` - Compiles TypeScript and bundles paribhasha.json and .env
- **package manager:** pnpm@10.18.2

### `/Users/achal/Code/md-mcp/tsconfig.json` - TypeScript Configuration
**Key Compiler Options:**
- **target:** ES2022 (modern JavaScript)
- **module:** Node16 (ESM format)
- **strict mode:** Enabled for type safety
- **Output:** Builds to ./build directory
- **Root:** Source from ./src directory

### `/Users/achal/Code/md-mcp/api.md` - Backend API Documentation
**Role:** Reference documentation for the Madhyasth Darshan REST API

**Includes:**
- Complete endpoint specifications
- Request/response examples
- Pagination and permission details
- CORS configuration
- Rate limiting notes

---

## Important Patterns and Conventions

### 1. Error Handling Pattern
All tools use consistent error handling:
```typescript
try {
  const data = await someAsyncFunction();
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
} catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true,
  };
}
```

### 2. Response Normalization
API responses are transformed to reduce noise:
- Removes fields not needed by Claude (images, HTML, metadata)
- Keeps essential information (page content, book metadata)
- Maintains hierarchical structure for TOC

### 3. Input Validation with Zod
Each tool parameter is validated using Zod schemas:
- Provides type safety and runtime validation
- Descriptions serve as tool documentation for Claude
- Optional parameters have defaults (e.g., page_no defaults to 1)

### 4. Caching Strategy
Paribhasha lexicon uses lazy singleton caching:
- Loaded once on first lookup
- Cached in module-level variable
- Subsequent calls use cached data

### 5. CLI Tool Pattern
Server is executable via `#!/usr/bin/env node` shebang
- Installed as `madhyasth` command via package.json bin field
- StdioServerTransport for process-based communication
- Error logging to stderr, data on stdout

---

## Dependencies and Technologies

### Production Dependencies
- **@modelcontextprotocol/sdk** (v1.20.2)
  - MCP server implementation
  - Provides McpServer and StdioServerTransport classes
  - Handles protocol serialization and communication

- **zod** (v3.25.76)
  - Runtime schema validation
  - Type inference for TypeScript
  - Used for tool parameter definitions

- **agentset** (v1.7.0)
  - Semantic search and knowledge base client
  - Provides vector search capabilities
  - Supports reranking and multi-tenancy

- **node-fetch** (v3.3.2)
  - HTTP client library
  - Used by Agentset SDK for API requests
  - Provides fetch API compatibility

### Development Dependencies
- **@types/node** (v24.9.1) - TypeScript types for Node.js APIs
- **typescript** (v5.9.3) - TypeScript compiler

### External Services
- **Madhyasth Darshan REST API** - `https://db.madhyasth.org/api/v1`
  - Django-based REST API backend
  - Provides books, pages, search, TOC
  - Public read access (no authentication required)

- **Agentset Knowledge Base** - `https://agentset.ai`
  - Semantic search and vector database service
  - Requires API key and namespace ID
  - Provides embedding-based search with reranking

### Technologies
- **Node.js 16+** - Runtime (ESM modules)
- **TypeScript** - Language with strict type checking
- **Fetch API** - HTTP client (native Node.js support)
- **JSON** - Data serialization format

---

## Build and Deployment

### Build Process
```bash
pnpm run build
```
**Steps:**
1. Compiles TypeScript (src/ → build/)
2. Copies paribhasha.json to build/
3. Copies .env to build/
4. Makes build/index.js executable (chmod 755)

**Prerequisites:**
- Ensure `.env` file is configured with valid Agentset credentials before building

### Development and Testing

#### MCP Inspector
The MCP Inspector is a web-based debugging tool that allows you to test and interact with the MCP server without setting up a full MCP client.

**Quick Start:**
```bash
pnpm run dev
```
This builds the project and launches the inspector in one command.

**Manual Inspection:**
```bash
# First build the project
pnpm run build

# Then run the inspector
pnpm run inspect
```

**What the Inspector Provides:**
- **Interactive Tool Testing**: Call any of the 6 MCP tools with custom parameters
- **Request/Response Inspection**: See exactly what data is sent and received
- **Schema Validation**: Verify that tool inputs match Zod schemas
- **Real-time Debugging**: Test semantic search, lexical search, and other tools
- **Web UI**: Accessible via browser at the URL shown in terminal

**Use Cases:**
- Test tools before integrating with Claude Desktop
- Debug API responses and error handling
- Verify Agentset semantic search is working correctly
- Explore paribhasha lexicon lookups interactively
- Validate book navigation and search functionality

**Inspector Commands:**
```bash
pnpm run inspect    # Launch inspector (requires build/ directory)
pnpm run dev        # Build + launch inspector (recommended for development)
```

### Package Distribution
- Published files: Only ./build/ directory (via files field)
- Executable entry point: build/index.js
- CLI command name: `madhyasth`

### Runtime Environment
- Standalone executable
- Communicates via stdio (stdin/stdout)
- Suitable for MCP client integration (Claude Desktop, API, etc.)

---

## Module Relationships Diagram

```
User/Claude
    │
    ▼
StdioServerTransport
    │
    ▼
McpServer (index.ts)
    ├── listBooks()
    ├── getBookPage()         ──┐
    ├── getBookToc()          ──┤──→ api.ts (fetchApi) ──→ Madhyasth REST API
    ├── searchBooks()         ──┘
    │
    ├── lookupWord()          ──→ paribhasha.ts (loadParibhasha) ──→ paribhasha.json
    │
    └── semanticSearch()      ──→ agentset.ts (searchKnowledgeBase)
                                      │
                                      ├──→ config.ts (getAgentsetConfig) ──→ .env
                                      │
                                      └──→ Agentset SDK ──→ Agentset API
```

---

## Code Organization Summary

**Single Responsibility:**
- `index.ts`: Tool registration and MCP protocol
- `api.ts`: REST API integration and data transformation
- `paribhasha.ts`: Local lexicon management
- `agentset.ts`: Semantic search integration
- `config.ts`: Configuration loading and validation

**Type Safety:**
- All async operations typed with TypeScript
- Zod schemas validate tool inputs
- Interface definitions prevent runtime errors

**Performance:**
- Paribhasha cached in memory after first load
- Simple substring search (O(n) but acceptable for ~1000s of terms)
- No persistent storage needed

**Usability:**
- 6 focused tools with clear purposes
- Descriptive parameter names and help text
- Consistent response format (JSON or formatted text)
- Graceful error handling
- Semantic search enhances discoverability

