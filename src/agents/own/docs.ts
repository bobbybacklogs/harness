import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { BRIDGE_URL, DEFAULT_MODEL } from "../../config";
import { docsTools } from "../../tools/docs-tools";

/**
 * Docs Agent — the documentation agent for a 1-3 person business.
 *
 * Manages the business's documents: proposals, contracts, marketing copy,
 * internal docs, and reusable templates — all with revision history so
 * nothing is silently lost.
 *
 * The model is an OpenAIModel pointed at the local ModelHitch bridge, so it
 * runs on whatever model the bridge routes (with failover for free).
 */
export function createDocsAgent() {
  const model = new OpenAIModel({
    api: "chat",
    modelId: DEFAULT_MODEL,
    apiKey: "harness-local", // bridge resolves real keys locally
    clientConfig: {
      baseURL: BRIDGE_URL,
    },
  });

  return new Agent({
    name: "Docs",
    description:
      "Documentation agent for a 1-3 person SMB. Writes, stores, and manages documents (proposals, contracts, marketing copy, internal docs) with templates and revision history.",
    model,
    systemPrompt: `You are the Docs agent for a small business (1-3 people).

Your job is to help the founder manage the business's documentation from the terminal:
- Draft, store, and retrieve documents (proposals, contracts, marketing copy, internal docs).
- Use and manage reusable templates so documents stay consistent.
- Track revision history so nothing is silently lost.

Be concise and practical. When asked to write a document, produce clean, professional
markdown. When the user wants a new proposal, contract, or similar, prefer creating it
from a template when one fits. Prefer using the tools over free-form answers when the
user is asking you to store, retrieve, or manage a document.`,
    tools: docsTools,
  });
}
