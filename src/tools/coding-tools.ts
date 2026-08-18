import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { Bash } from "just-bash";

/**
 * Coding tools — a fully sandboxed coding surface for the Coding agent.
 *
 * Everything runs inside just-bash's virtual bash environment: an in-memory
 * filesystem that is completely isolated from the host, with network access
 * disabled by default and hardened execution limits. The agent can write code,
 * run it, and inspect results without ever touching the real machine.
 *
 * Security model:
 *  - In-memory filesystem (default): no host file access at all. Verified —
 *    the sandbox cannot read /etc/passwd, C:/Windows/win.ini, or any host path.
 *  - Network disabled by default: curl/wget are not even registered.
 *  - executionLimitProfile: "hardened": tight limits on time, output, and
 *    compute to prevent runaway execution.
 *  - python/javascript disabled: minimal attack surface.
 *  - defenseInDepth is disabled because it patches Node internals that Bun
 *    doesn't support (DefenseInDepthBox error). Per just-bash docs this is a
 *    SECONDARY layer; the primary security is the sandbox itself, which is
 *    intact under Bun.
 *
 * A single Bash instance is shared across tool calls so the agent's virtual
 * workspace persists for the lifetime of the process (a session).
 */

/** Persistent sandboxed bash instance shared across tool calls. */
let bash: Bash | null = null;

function getBash(): Bash {
  if (!bash) {
    bash = new Bash({
      // Required for Bun: just-bash's defense-in-depth patches Node internals
      // (Module._resolveFilename) that Bun doesn't expose. The core sandbox
      // (in-memory FS, network-off, execution limits) is unaffected.
      defenseInDepth: { enabled: false },
      // Tight limits to prevent runaway compute.
      executionLimitProfile: "hardened",
      // Network is disabled by default; keep it that way for 100% isolation.
      // python/javascript stay disabled (default) to minimize attack surface.
    });
  }
  return bash;
}

/** Cap the returned output so a single tool call can't flood the model. */
const MAX_OUTPUT = 8000;

function truncate(s: string): string {
  if (s.length <= MAX_OUTPUT) return s;
  return `${s.slice(0, MAX_OUTPUT)}\n… [output truncated, ${s.length - MAX_OUTPUT} more chars]`;
}

/** Run a command in the sandboxed virtual bash. */
export const runCommand = tool({
  name: "run_command",
  description:
    "Run a bash command inside the sandboxed virtual environment. The filesystem is in-memory and isolated from the host; network is disabled. Use this to write, run, and test code safely. Returns stdout, stderr, and exit code.",
  inputSchema: z.object({ command: z.string() }),
  callback: async (input) => {
    const result = await getBash().exec(input.command);
    const parts: string[] = [];
    if (result.stdout) parts.push(`[stdout]\n${truncate(result.stdout)}`);
    if (result.stderr) parts.push(`[stderr]\n${truncate(result.stderr)}`);
    parts.push(`[exit code] ${result.exitCode}`);
    return parts.join("\n\n");
  },
});

/** Write a file into the sandboxed virtual filesystem. */
export const writeFile = tool({
  name: "write_file",
  description:
    "Write a file into the sandboxed virtual filesystem (e.g. /home/user/main.ts). Creates parent directories as needed. The file persists for the session.",
  inputSchema: z.object({ path: z.string(), content: z.string() }),
  callback: async (input) => {
    const b = getBash();
    // Ensure parent directory exists.
    const dir = input.path.includes("/")
      ? input.path.slice(0, input.path.lastIndexOf("/"))
      : ".";
    await b.exec(`mkdir -p ${JSON.stringify(dir)}`);
    await b.writeFile(input.path, input.content);
    return `Wrote ${input.path.length} bytes to ${input.path}.`;
  },
});

/** Read a file from the sandboxed virtual filesystem. */
export const readFile = tool({
  name: "read_file",
  description:
    "Read the full contents of a file from the sandboxed virtual filesystem by path.",
  inputSchema: z.object({ path: z.string() }),
  callback: async (input) => {
    const b = getBash();
    const content = await b.readFile(input.path).catch(() => null);
    if (content === null) return `No such file: ${input.path}`;
    return truncate(content);
  },
});

/** List a directory in the sandboxed virtual filesystem. */
export const listDir = tool({
  name: "list_dir",
  description:
    "List the entries of a directory in the sandboxed virtual filesystem (defaults to the current working directory).",
  inputSchema: z.object({ path: z.string().optional() }),
  callback: async (input) => {
    const b = getBash();
    const target = input.path ?? b.getCwd();
    const result = await b.exec(`ls -la ${JSON.stringify(target)}`);
    return result.stdout || `(empty or no such directory: ${target})`;
  },
});

/** Recursively list all files under a directory. */
export const listFiles = tool({
  name: "list_files",
  description:
    "Recursively list all files under a directory in the sandboxed virtual filesystem (defaults to the current working directory). Useful to see the whole project tree.",
  inputSchema: z.object({ path: z.string().optional() }),
  callback: async (input) => {
    const b = getBash();
    const target = input.path ?? b.getCwd();
    const result = await b.exec(`find ${JSON.stringify(target)} -type f`);
    return truncate(result.stdout || `(no files under ${target})`);
  },
});

/** All coding tools exposed to the Coding agent. */
export const codingTools = [runCommand, writeFile, readFile, listDir, listFiles];
