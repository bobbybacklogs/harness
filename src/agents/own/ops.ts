import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { BRIDGE_URL, DEFAULT_MODEL } from "../../config";
import { opsTools } from "../../tools/ops-tools";

/**
 * Ops Agent — the MVP agent for running a 1-3 person business from the
 * terminal. Handles SOPs, notes, and the action log.
 *
 * The model is an OpenAIModel pointed at the local ModelHitch bridge, so it
 * runs on whatever model the bridge routes (with failover for free).
 */
export function createOpsAgent() {
  const model = new OpenAIModel({
    api: "chat",
    modelId: DEFAULT_MODEL,
    apiKey: "harness-local", // bridge resolves real keys locally
    clientConfig: {
      baseURL: BRIDGE_URL,
    },
  });

  return new Agent({
    name: "Ops",
    description:
      "Business operations agent for a 1-3 person SMB. Manages SOPs, notes, and the action log from the terminal.",
    model,
    systemPrompt: `You are the Ops agent for a small business (1-3 people).

Your job is to help the founder run day-to-day business operations from the terminal:
- Draft, store, and retrieve standard operating procedures (SOPs).
- Capture and organize business notes.
- Maintain an action log of open tasks and mark them done.

Be concise and practical. When asked to create an SOP, produce clear, step-by-step
markdown. When the user mentions a task, add it to the action log. Prefer using the
tools over free-form answers when the user is asking you to store or retrieve something.`,
    tools: opsTools,
  });
}
