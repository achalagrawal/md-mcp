import { Agentset } from "agentset";
import nodeFetch from "node-fetch";
import { getAgentsetConfig } from "./config.js";

export interface SearchOptions {
  topK?: number;
  rerank?: boolean;
}

export interface SearchResult {
  text: string;
  metadata?: Record<string, string>;
}

let agentsetInstance: Agentset | null = null;
let namespaceId: string | null = null;
let tenantId: string | undefined = undefined;

/**
 * Initialize Agentset client with configuration
 */
function initializeAgentset(): void {
  if (agentsetInstance) {
    return;
  }

  const config = getAgentsetConfig();

  agentsetInstance = new Agentset({
    apiKey: config.apiKey,
    fetcher: (url, init) => {
      return nodeFetch(
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : url.url,
        init as any,
      ) as unknown as Promise<Response>;
    },
  });

  namespaceId = config.namespaceId;
  tenantId = config.tenantId;
}

/**
 * Search the knowledge base using Agentset
 */
export async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  // Initialize on first use
  initializeAgentset();

  if (!agentsetInstance || !namespaceId) {
    throw new Error("Agentset client not initialized");
  }

  const { topK = 10, rerank = true } = options;

  const namespace = agentsetInstance.namespace(namespaceId);
  const results = await namespace.search(
    query,
    { topK, rerank },
    tenantId ? { tenantId } : undefined,
  );

  return results.map((item) => ({
    text: item.text || "",
    metadata: item.metadata as Record<string, string> | undefined,
  }));
}

/**
 * Format search results for display to Claude
 */
export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map((item, index) => {
      const metadata = item.metadata || {};
      let text = `--- Result ${index + 1} ---\n`;

      // Add metadata if present
      const relevantMetadata: Record<string, string> = {};
      if (metadata.book_title) relevantMetadata["Book Title"] = metadata.book_title;
      if (metadata.book_id) relevantMetadata["Book ID"] = metadata.book_id;
      if (metadata.page_no) relevantMetadata["Page No"] = metadata.page_no;

      if (Object.keys(relevantMetadata).length > 0) {
        text += "Metadata:\n";
        for (const [key, value] of Object.entries(relevantMetadata)) {
          text += `  ${key}: ${value}\n`;
        }
        text += "\n";
      }

      text += "Content:\n";
      text += item.text;
      text += "\n\n---";

      return text;
    })
    .join("\n\n");
}
