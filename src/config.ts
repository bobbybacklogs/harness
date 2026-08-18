import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Central configuration for the harness.
 *
 * Everything the harness needs to know about its environment lives here so
 * the rest of the code stays free of magic paths and env-var lookups.
 */

/** Directory where the user's Copilot custom agents live (.agent.md files). */
export const COPILOT_AGENTS_DIR =
  process.env.HARNESS_COPILOT_AGENTS_DIR ?? join(homedir(), ".copilot", "agents");

/** Directory where the harness keeps its own runtime state (sessions, notes, SOPs). */
export const HARNESS_HOME =
  process.env.HARNESS_HOME ?? join(homedir(), ".harness");

/** Directory for the harness's own native agents (Strands-native, not imported). */
export const OWN_AGENTS_DIR = join(import.meta.dir, "..", "agents", "own");

/** ModelHitch bridge base URL (OpenAI-compatible). */
export const BRIDGE_URL =
  process.env.HARNESS_BRIDGE_URL ?? "http://127.0.0.1:3939/v1";

/** Default model id routed through the bridge. */
export const DEFAULT_MODEL =
  process.env.HARNESS_MODEL ?? "opencode-go/deepseek-v4-flash";

/** Provider id used when talking to the bridge directly. */
export const BRIDGE_PROVIDER = "bridge";
