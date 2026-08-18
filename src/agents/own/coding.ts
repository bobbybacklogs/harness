import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { BRIDGE_URL, DEFAULT_MODEL } from "../../config";
import { codingTools } from "../../tools/coding-tools";

/**
 * Coding Agent — the sandboxed coding agent for a 1-3 person business.
 *
 * Writes, runs, and tests code inside a fully sandboxed virtual bash
 * environment (just-bash): an in-memory filesystem isolated from the host,
 * network disabled, and hardened execution limits. The agent can safely
 * prototype, script, and verify code without ever touching the real machine.
 *
 * The model is an OpenAIModel pointed at the local ModelHitch bridge, so it
 * runs on whatever model the bridge routes (with failover for free).
 */
export function createCodingAgent() {
  const model = new OpenAIModel({
    api: "chat",
    modelId: DEFAULT_MODEL,
    apiKey: "harness-local", // bridge resolves real keys locally
    clientConfig: {
      baseURL: BRIDGE_URL,
    },
  });

  return new Agent({
    name: "Coding",
    description:
      "Sandboxed coding agent for a 1-3 person SMB. Writes, runs, and tests code in a fully isolated virtual environment (in-memory filesystem, no network).",
    model,
    systemPrompt: `You are the Coding agent for a small business (1-3 people).

Your job is to help the founder write, run, and test code — safely. You work inside a
fully sandboxed virtual bash environment:
- The filesystem is in-memory and completely isolated from the host. You cannot read or
  write any real files on the machine.
- Network access is disabled. You cannot reach the internet.
- Execution is limited (hardened profile) to prevent runaway compute.

Workflow:
- Use write_file to create source files in the virtual workspace (e.g. /home/user/).
- Use run_command to run scripts, tests, or commands and see their output.
- Use read_file, list_dir, and list_files to inspect the workspace.
- Iterate: write, run, read errors, fix, re-run until it works.

Be concise and practical. Prefer actually writing and running code over describing it.
When you finish a task, summarize what you built, how you verified it, and note that the
work lives in the sandbox (it does not touch the real machine).`,
    tools: codingTools,
  });
}
