#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listBooks, getBookPage, getBookToc, searchBooks } from "./api.js";
import { lookupWord } from "./paribhasha.js";

const server = new McpServer({
  name: "madhyasth-darshan",
  version: "1.0.0",
});

// Tool 1: list_books - Get all published books
server.tool(
  "list_books",
  "Get a list of all published books from the Madhyasth Darshan library",
  {},
  async () => {
    try {
      const books = await listBooks();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(books, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching books: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: get_book_page - Get a specific page from a book
server.tool(
  "get_book_page",
  "Get a specific page from a book. Returns book info (id, title, category) and page content (page_no, content).",
  {
    book_id: z.number().describe("The ID of the book"),
    page_no: z
      .number()
      .optional()
      .default(1)
      .describe(
        "Page number (can be negative for preface pages, defaults to 1)"
      ),
  },
  async ({ book_id, page_no }) => {
    try {
      const pageData = await getBookPage(book_id, page_no);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(pageData, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching book page: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: get_book_toc - Get table of contents for a book
server.tool(
  "get_book_toc",
  "Get the hierarchical table of contents for a book",
  {
    book_id: z.number().describe("The ID of the book"),
  },
  async ({ book_id }) => {
    try {
      const toc = await getBookToc(book_id);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(toc, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching table of contents: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 4: search_books - Full-text search across book content
server.tool(
  "search_books",
  "Search across all book content with proximity-based matching. Returns paginated results with snippets.",
  {
    query: z.string().describe("Search query"),
    book_ids: z
      .string()
      .optional()
      .describe(
        "Optional comma-separated list of book IDs to search within (e.g., '1,2,3')"
      ),
  },
  async ({ query, book_ids }) => {
    try {
      const results = await searchBooks(query, book_ids);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching books: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 5: lookup_paribhasha - Lookup word definitions
server.tool(
  "lookup_paribhasha",
  "Lookup word definitions from the Madhyasth Darshan paribhasha (lexicon). Searches case-insensitively across Hindi and Hinglish (romanized) terms.",
  {
    word: z
      .string()
      .describe(
        "The word to lookup (can be in Hindi or Hinglish/romanized form)"
      ),
  },
  async ({ word }) => {
    try {
      const results = await lookupWord(word);

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No definitions found for "${word}"`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error looking up word: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Madhyasth Darshan MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
