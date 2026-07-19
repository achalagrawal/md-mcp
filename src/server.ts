import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listBooks, getBookPage, getBookToc, searchBooks } from "./api.js";
import { lookupWord } from "./paribhasha.js";
import { searchKnowledgeBase, formatSearchResults } from "./agentset.js";

import type { McpServer as McpServerType } from "@modelcontextprotocol/sdk/server/mcp.js";

export function createServer(): McpServerType {
  const server = new McpServer({
    name: "madhyasth-darshan",
    version: "1.0.0",
  });

  // Tool 1: list_books - Get all published books
  server.tool(
    "list_books",
    "Get a list of all the books from the Madhyasth Darshan library",
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
    },
  );

  // Tool 2: get_book_page - Get a specific page from a book
  server.tool(
    "get_book_page",
    "Get a specific page from a book. Returns book info (id, title, category) and page content (page_no, content).",
    {
      book_id: z.number().describe("The ID of the book."),
      page_no: z
        .number()
        .optional()
        .default(1)
        .describe(
          "Page number (can be negative for preface pages, defaults to 1)",
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
    },
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
    },
  );

  // Tool 4: search_books - Full-text search across book content
  server.tool(
    "lexical_search_books",
    "Lexical search across all books. Returns paginated results with snippets. Use for exact word matches. Supports pagination via the 'page' parameter.",
    {
      query: z.string().describe("Search query"),
      book_ids: z
        .string()
        .optional()
        .describe(
          "Optional comma-separated list of book IDs to search within (e.g., '1,2,3')",
        ),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe("Page number to fetch (default: 1)"),
    },
    async ({ query, book_ids, page }) => {
      try {
        const results = await searchBooks(query, book_ids, page);

        // Format output with pagination info
        const paginationInfo = `Search Results (Page ${results.current_page} of ${results.total_pages})
  Total: ${results.count} results (showing ${results.results.length} per page)
  Has Next Page: ${results.has_next}
  Has Previous Page: ${results.has_previous}

  Results:`;

        const fullOutput = paginationInfo + "\n" + JSON.stringify(results.results, null, 2);

        return {
          content: [
            {
              type: "text",
              text: fullOutput,
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
    },
  );

  // Tool 5: lookup_paribhasha - Lookup word definitions
  server.tool(
    "lookup_paribhasha",
    "Lookup word definitions from the Madhyasth Darshan paribhasha (lexicon/dictionary). Searches case-insensitively across Hindi and Hinglish (romanized) terms.",
    {
      word: z
        .string()
        .describe(
          "The word to lookup (can be in Hindi or Hinglish/romanized form)",
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
    },
  );

  // Tool 6: semantic_search - Semantic search in knowledge base using Agentset
  server.tool(
    "semantic_search",
    "Search the Madhyasth Darshan knowledge base using semantic search.",
    {
      query: z.string().describe("The search query"),
      topK: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe("Maximum number of results to return (1-100, defaults to 10)"),
      rerank: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to rerank results by relevance (defaults to true)"),
    },
    async ({ query, topK, rerank }) => {
      try {
        const results = await searchKnowledgeBase(query, { topK, rerank });
        const formattedResults = formatSearchResults(results);

        return {
          content: [
            {
              type: "text",
              text: formattedResults,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error performing semantic search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}

// Singleton retained for the stdio entry point.
export const server = createServer();
