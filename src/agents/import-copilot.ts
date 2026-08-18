import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { COPILOT_AGENTS_DIR } from "../config";

/**
 * Parsed representation of a Copilot `.agent.md` custom agent.
 *
 * These files are VS Code-specific (target: vscode, tools are VS Code tool
 * IDs), so we treat them as a *persona source*: we extract the identity and
 * system prompt, and map the tool IDs to harness tools at registration time.
 */
export interface CopilotAgent {
  /** File name without extension, e.g. "full-stack-generalist". */
  id: string;
  /** Display name from frontmatter. */
  name: string;
  /** Description from frontmatter (used for routing). */
  description: string;
  /** argument-hint from frontmatter, if present. */
  argumentHint?: string;
  /** VS Code tool IDs the agent is allowed to use. */
  tools: string[];
  /** Subagent names it can delegate to. */
  agents: string[];
  /** Handoff definitions (label/agent/prompt/send). */
  handoffs: { label: string; agent: string; prompt: string; send: boolean }[];
  /** The markdown system prompt body (everything after the frontmatter). */
  systemPrompt: string;
  /** Raw frontmatter fields we don't otherwise interpret. */
  raw: Record<string, unknown>;
}

/** Parse a single `.agent.md` file into a CopilotAgent. */
export function parseAgentFile(id: string, content: string): CopilotAgent {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`Agent "${id}" has no YAML frontmatter block.`);
  }
  const [, frontmatter, body] = match;
  const raw = parseFrontmatter(frontmatter);

  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const strList = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)) : typeof v === "string" ? [v] : [];

  const handoffs = Array.isArray(raw.handoffs)
    ? raw.handoffs.map((h) => {
        const o = (h ?? {}) as Record<string, unknown>;
        return {
          label: str(o.label),
          agent: str(o.agent),
          prompt: str(o.prompt),
          send: Boolean(o.send),
        };
      })
    : [];

  return {
    id,
    name: str(raw.name) || id,
    description: str(raw.description),
    argumentHint: str(raw["argument-hint"]) || undefined,
    tools: strList(raw.tools),
    agents: strList(raw.agents),
    handoffs,
    systemPrompt: body.trim(),
    raw,
  };
}

/** Minimal YAML frontmatter parser (handles the subset used by .agent.md files). */
function parseFrontmatter(text: string): Record<string, unknown> {
  const out: Record<string, unknown> & { _lastKey?: string } = {};
  const lines = text.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i++;
      continue;
    }
    // List item continuation (indented under a key) — collect into current key.
    if (/^[-*]\s+/.test(trimmed) && out._lastKey) {
      const val = trimmed.replace(/^[-*]\s+/, "").trim();
      const arr = out[out._lastKey];
      if (Array.isArray(arr)) arr.push(unquote(val));
      i++;
      continue;
    }
    const colon = line.indexOf(":");
    if (colon === -1) {
      i++;
      continue;
    }
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value === "" || value === "|" || value === ">") {
      // Block scalar or empty — treat as array or string accumulator.
      if (value === "") {
        // Could be a nested map or an empty value; peek next line.
        const next = lines[i + 1]?.trim() ?? "";
        if (/^[-*]\s+/.test(next)) {
          out[key] = [];
          out._lastKey = key;
        } else {
          out[key] = "";
        }
      } else {
        // Block scalar: collect following indented lines.
        const block: string[] = [];
        let j = i + 1;
        while (j < lines.length && /^\s+\S/.test(lines[j])) {
          block.push(lines[j].trim());
          j++;
        }
        out[key] = block.join("\n");
        i = j - 1;
      }
    } else {
      out[key] = unquote(value);
    }
    i++;
  }
  delete out._lastKey;
  return out;
}

function unquote(v: string): string {
  const s = v.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/** Load every `.agent.md` file from the Copilot agents directory. */
export async function loadCopilotAgents(dir = COPILOT_AGENTS_DIR): Promise<CopilotAgent[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const agents: CopilotAgent[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".agent.md")) continue;
    const id = entry.name.replace(/\.agent\.md$/, "");
    const content = await readFile(join(dir, entry.name), "utf8");
    try {
      agents.push(parseAgentFile(id, content));
    } catch (err) {
      console.warn(`[import] skipped ${entry.name}: ${(err as Error).message}`);
    }
  }
  return agents.sort((a, b) => a.name.localeCompare(b.name));
}
