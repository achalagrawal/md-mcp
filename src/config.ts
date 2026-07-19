import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export interface AgentsetConfig {
  apiKey: string;
  namespaceId: string;
  tenantId?: string;
}

/**
 * Load configuration from .env file
 * The .env file should be in the same directory as the compiled JavaScript
 */
function loadEnvFile(): Record<string, string> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, ".env");

  try {
    const envContent = readFileSync(envPath, "utf8");
    const envVars: Record<string, string> = {};

    // Parse .env file
    envContent.split("\n").forEach((line) => {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      // Parse key=value
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        envVars[key.trim()] = value;
      }
    });

    return envVars;
  } catch (error) {
    throw new Error(
      `Failed to load .env file from ${envPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load the .env file, returning an empty record if it is absent.
 * In containerized deployments secrets are injected via process.env,
 * so a missing .env file is not an error.
 */
function loadEnvFileSafe(): Record<string, string> {
  try {
    return loadEnvFile();
  } catch {
    return {};
  }
}

/**
 * Get Agentset configuration.
 * Prefers process.env (container/runtime injection) and falls back to a
 * bundled .env file for local stdio usage.
 */
export function getAgentsetConfig(): AgentsetConfig {
  const fileEnv = loadEnvFileSafe();

  const apiKey = process.env.AGENTSET_API_KEY ?? fileEnv.AGENTSET_API_KEY;
  const namespaceId = process.env.AGENTSET_NAMESPACE_ID ?? fileEnv.AGENTSET_NAMESPACE_ID;
  const tenantId = process.env.AGENTSET_TENANT_ID ?? fileEnv.AGENTSET_TENANT_ID;

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error(
      "AGENTSET_API_KEY not configured in .env file. Please set your Agentset API key.",
    );
  }

  if (!namespaceId || namespaceId === "your_namespace_id_here") {
    throw new Error(
      "AGENTSET_NAMESPACE_ID not configured in .env file. Please set your Agentset namespace ID.",
    );
  }

  return {
    apiKey,
    namespaceId,
    tenantId: tenantId && tenantId !== "your_tenant_id_here" ? tenantId : undefined,
  };
}
