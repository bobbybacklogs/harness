/**
 * End-to-end smoke test for the harness.
 *
 * Verifies the full pipeline without the TUI:
 *   1. Builds the agent registry (own + imported Copilot personas).
 *   2. Invokes the Ops agent against the ModelHitch bridge.
 *   3. Prints the agent's reply.
 *
 * Run with: bun run scripts/smoke.ts
 * Requires the bridge to be running (bun run bridge).
 */
import { buildRegistry } from "../src/agents/registry";

const registry = await buildRegistry();
console.log(`Registry loaded: ${registry.length} agents`);
for (const a of registry) {
  console.log(`  - [${a.source}] ${a.id}: ${a.name} — ${a.description}`);
}

const ops = registry.find((a) => a.id === "ops");
if (!ops) {
  console.error("Ops agent not found in registry");
  process.exit(1);
}

console.log("\nInvoking Ops agent against bridge...");
const agent = ops.build();
const result = await agent.invoke("List my current SOPs and add a note: 'Smoke test ran at startup'.");
console.log("\n--- Ops agent reply ---");
console.log(result.toString());
console.log("--- end ---");
