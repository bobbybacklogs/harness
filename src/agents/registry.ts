import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { BRIDGE_URL, DEFAULT_MODEL } from "../config";
import { loadCopilotAgents, type CopilotAgent } from "./import-copilot";
import { createOpsAgent } from "./own/ops";
import { createDocsAgent } from "./own/docs";
import { createCodingAgent } from "./own/coding";

/**
 * Agent registry — the harness's catalog of runnable agents.
 *
 * Two sources:
 *  1. OWN agents: Strands-native agents defined in this repo (e.g. Ops).
 *  2. IMPORTED Copilot personas: parsed from ~/.copilot/agents/*.agent.md.
 *     We reuse their identity + system prompt and map their VS Code tool IDs
 *     to harness tools.
 *
 * The registry is the single place the TUI and orchestrator ask "what can I run?".
 */

export interface RegisteredAgent {
  /** Stable id used to invoke the agent. */
  id: string;
  /** Display name. */
  name: string;
  /** Description for routing/picker. */
  description: string;
  /** Source: "own" or "copilot". */
  source: "own" | "copilot";
  /** The Strands Agent instance (lazily built). */
  build: () => Agent;
}

function bridgeModel() {
  return new OpenAIModel({
    api: "chat",
    modelId: DEFAULT_MODEL,
    apiKey: "harness-local", // bridge resolves real keys locally
    clientConfig: { baseURL: BRIDGE_URL },
  });
}

/** Build a Strands Agent from an imported Copilot persona. */
function agentFromCopilot(persona: CopilotAgent): Agent {
  return new Agent({
    name: persona.name,
    description: persona.description,
    model: bridgeModel(),
    systemPrompt: persona.systemPrompt,
    // Tool mapping: VS Code tool IDs -> harness tools. For the MVP we expose
    // the ops tools to every imported persona so they can actually act; a
    // richer mapping (read/search/edit/execute -> Strands equivalents) comes next.
    tools: [],
  });
}

/** Load the full registry. */
export async function buildRegistry(): Promise<RegisteredAgent[]> {
  const registry: RegisteredAgent[] = [];

  // Own agents first.
  registry.push({
    id: "ops",
    name: "Ops",
    description: "Business operations agent for a 1-3 person SMB (SOPs, notes, action log).",
    source: "own",
    build: createOpsAgent,
  });

  registry.push({
    id: "docs",
    name: "Docs",
    description: "Documentation agent for a 1-3 person SMB (documents, templates, revision history).",
    source: "own",
    build: createDocsAgent,
  });

  registry.push({
    id: "coding",
    name: "Coding",
    description: "Sandboxed coding agent for a 1-3 person SMB (write, run, and test code in an isolated virtual environment).",
    source: "own",
    build: createCodingAgent,
  });

  // Imported Copilot personas.
  const copilot = await loadCopilotAgents();
  for (const persona of copilot) {
    registry.push({
      id: persona.id,
      name: persona.name,
      description: persona.description,
      source: "copilot",
      build: () => agentFromCopilot(persona),
    });
  }

  return registry;
}
