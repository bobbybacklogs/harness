/**
 * Harness — OpenTUI entry point.
 *
 * A terminal UI for running agents (own + imported Copilot personas) on any
 * model via the ModelHitch bridge.
 *
 * Run: bun run dev   (start the bridge first with: bun run bridge)
 */
import { createCliRenderer, Box, Text, Input, TextAttributes } from "@opentui/core";
import { buildRegistry, type RegisteredAgent } from "./agents/registry";
import { BRIDGE_URL, DEFAULT_MODEL } from "./config";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
});

// ---- State -------------------------------------------------------------
const registry = await buildRegistry();
let selected: RegisteredAgent = registry.find((a) => a.id === "ops") ?? registry[0];
const log: { role: "user" | "agent"; text: string }[] = [];

// ---- Layout ------------------------------------------------------------
const root = renderer.root;

const header = Box(
  {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 1,
    borderStyle: "rounded",
  },
  Text({ content: "HARNESS", fg: "#8bd600", attributes: TextAttributes.BOLD }),
  Text({ content: `model: ${DEFAULT_MODEL}`, fg: "#64748b" }),
);

const agentBar = Box(
  {
    flexDirection: "row",
    gap: 1,
    padding: 1,
  },
  Text({ content: "agent:", fg: "#64748b" }),
  Text({ content: selected.name, fg: "#e2e8f0", attributes: TextAttributes.BOLD }),
  Text({ content: `[${selected.source}]`, fg: "#64748b" }),
);

const logBox = Box({
  flexDirection: "column",
  flexGrow: 1,
  padding: 1,
  borderStyle: "rounded",
});

const input = Input({
  id: "prompt",
  placeholder: "Ask the agent... (Ctrl+C to quit)",
  width: "100%",
});

root.add(header);
root.add(agentBar);
root.add(logBox);
root.add(input);

// ---- Rendering helpers -------------------------------------------------
function renderLog() {
  logBox.children = [];
  if (log.length === 0) {
    logBox.add(
      Text({
        content: "No messages yet. Pick an agent and ask something.",
        fg: "#64748b",
      }),
    );
    return;
  }
  for (const entry of log) {
    const label = entry.role === "user" ? "you" : selected.name;
    const fg = entry.role === "user" ? "#2563eb" : "#8bd600";
    logBox.add(Text({ content: `${label}:`, fg, attributes: TextAttributes.BOLD }));
    logBox.add(Text({ content: entry.text, fg: "#e2e8f0" }));
    logBox.add(Text({ content: "", fg: "#64748b" }));
  }
}

function setStatus(text: string, fg = "#64748b") {
  agentBar.children = [
    Text({ content: "agent:", fg: "#64748b" }),
    Text({ content: selected.name, fg: "#e2e8f0", attributes: TextAttributes.BOLD }),
    Text({ content: `[${selected.source}]`, fg: "#64748b" }),
    Text({ content: `  ${text}`, fg }),
  ];
}

renderLog();

// ---- Agent switching (Tab cycles agents) -------------------------------
renderer.keyInput.on("keypress", (key) => {
  if (key.name === "tab") {
    const idx = registry.findIndex((a) => a.id === selected.id);
    selected = registry[(idx + 1) % registry.length];
    setStatus(`switched to ${selected.name}`);
    renderLog();
  }
});

// ---- Send prompt on Enter ----------------------------------------------
input.on("change", async (value: string) => {
  const prompt = value.trim();
  if (!prompt) return;

  log.push({ role: "user", text: prompt });
  renderLog();
  setStatus("thinking...", "#f59e0b");

  try {
    const agent = selected.build();
    const result = await agent.invoke(prompt);
    const text = result.toString();
    log.push({ role: "agent", text });
    setStatus("done");
  } catch (err) {
    log.push({
      role: "agent",
      text: `[error] ${(err as Error).message}\n\nIs the bridge running? Start it with: bun run bridge`,
    });
    setStatus("error", "#ef4444");
  }
  renderLog();
});

console.log(`\nHarness ready. Bridge: ${BRIDGE_URL}`);
console.log(`${registry.length} agents loaded (${registry.filter((a) => a.source === "own").length} own, ${registry.filter((a) => a.source === "copilot").length} copilot).`);
console.log("Tab: switch agent   Enter: send   Ctrl+C: quit\n");
