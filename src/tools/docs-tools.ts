import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { mkdir, readFile, readdir, writeFile, unlink, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { HARNESS_HOME } from "../config";

/**
 * Docs tools — the documentation surface for a 1-3 person SMB.
 *
 * Gives the Docs agent real, local capabilities: a document store (proposals,
 * contracts, marketing copy, internal docs), reusable templates, and a
 * revision-history index so nothing is ever silently lost.
 *
 * Layout under HARNESS_HOME:
 *   docs/            — the document store (markdown)
 *   templates/       — reusable document templates (markdown)
 *   docs-history.json — revision history index
 *
 * Starter templates ship in the repo at agents/templates/ and are copied into
 * HARNESS_HOME/templates/ on first use, so the agent has working templates
 * immediately while user edits persist in HARNESS_HOME.
 */

const docsDir = () => join(HARNESS_HOME, "docs");
const templatesDir = () => join(HARNESS_HOME, "templates");
const historyFile = () => join(HARNESS_HOME, "docs-history.json");

/** Repo location of the starter templates (source of truth for defaults). */
const starterTemplatesDir = () => join(import.meta.dir, "..", "..", "agents", "templates");

async function ensureDirs() {
  await mkdir(docsDir(), { recursive: true });
  await mkdir(templatesDir(), { recursive: true });
  await seedStarterTemplates();
}

/** Copy repo starter templates into HARNESS_HOME/templates/ if not already present. */
async function seedStarterTemplates() {
  const entries = await readdir(starterTemplatesDir()).catch(() => []);
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const dest = join(templatesDir(), entry);
    try {
      await readFile(dest, "utf8");
    } catch {
      await copyFile(join(starterTemplatesDir(), entry), dest);
    }
  }
}

/** Sanitize a document/template name into a safe filename stem. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

interface HistoryEntry {
  version: number;
  timestamp: string;
  summary: string;
}

interface DocHistory {
  [docName: string]: HistoryEntry[];
}

async function readHistory(): Promise<DocHistory> {
  return await readFile(historyFile(), "utf8")
    .then((t) => JSON.parse(t) as DocHistory)
    .catch(() => ({}));
}

async function writeHistory(history: DocHistory) {
  await mkdir(HARNESS_HOME, { recursive: true });
  await writeFile(historyFile(), JSON.stringify(history, null, 2), "utf8");
}

/** List all stored documents. */
export const listDocs = tool({
  name: "list_docs",
  description: "List all stored documents (proposals, contracts, marketing copy, internal docs).",
  inputSchema: z.object({}),
  callback: async () => {
    await ensureDirs();
    const entries = await readdir(docsDir()).catch(() => []);
    return entries.filter((e) => e.endsWith(".md")).join("\n") || "(no documents yet)";
  },
});

/** Read a single document by name. */
export const readDoc = tool({
  name: "read_doc",
  description: "Read the full text of a stored document by name (without .md).",
  inputSchema: z.object({ name: z.string() }),
  callback: async (input) => {
    await ensureDirs();
    const safe = safeName(input.name);
    return await readFile(join(docsDir(), `${safe}.md`), "utf8").catch(
      () => `No document named "${input.name}".`,
    );
  },
});

/** Write (create or overwrite) a document, recording a history entry. */
export const writeDoc = tool({
  name: "write_doc",
  description:
    "Create or overwrite a document by name with the given markdown content. Records a revision in the document's history.",
  inputSchema: z.object({ name: z.string(), content: z.string(), summary: z.string().optional() }),
  callback: async (input) => {
    await ensureDirs();
    const safe = safeName(input.name);
    await writeFile(join(docsDir(), `${safe}.md`), input.content, "utf8");

    // Record revision history.
    const history = await readHistory();
    const entries = history[input.name] ?? [];
    const version = entries.length + 1;
    entries.push({
      version,
      timestamp: new Date().toISOString(),
      summary: input.summary ?? (version === 1 ? "Created" : "Updated"),
    });
    history[input.name] = entries;
    await writeHistory(history);

    return `Saved document "${input.name}" (v${version}).`;
  },
});

/** Delete a document and its history. */
export const deleteDoc = tool({
  name: "delete_doc",
  description: "Delete a stored document by name (and its revision history).",
  inputSchema: z.object({ name: z.string() }),
  callback: async (input) => {
    await ensureDirs();
    const safe = safeName(input.name);
    const path = join(docsDir(), `${safe}.md`);
    try {
      await unlink(path);
    } catch {
      return `No document named "${input.name}".`;
    }
    const history = await readHistory();
    delete history[input.name];
    await writeHistory(history);
    return `Deleted document "${input.name}".`;
  },
});

/** List all available templates. */
export const listTemplates = tool({
  name: "list_templates",
  description: "List all available document templates (proposal, contract, invoice, meeting notes, etc.).",
  inputSchema: z.object({}),
  callback: async () => {
    await ensureDirs();
    const entries = await readdir(templatesDir()).catch(() => []);
    return entries.filter((e) => e.endsWith(".md")).join("\n") || "(no templates yet)";
  },
});

/** Read a single template by name. */
export const readTemplate = tool({
  name: "read_template",
  description: "Read the full text of a template by name (without .md).",
  inputSchema: z.object({ name: z.string() }),
  callback: async (input) => {
    await ensureDirs();
    const safe = safeName(input.name);
    return await readFile(join(templatesDir(), `${safe}.md`), "utf8").catch(
      () => `No template named "${input.name}".`,
    );
  },
});

/** Create a new document from a template. */
export const createFromTemplate = tool({
  name: "create_from_template",
  description:
    "Create a new document from a template, filling in the given details. The template's placeholders are replaced with the provided content.",
  inputSchema: z.object({
    template: z.string(),
    name: z.string(),
    details: z.string(),
  }),
  callback: async (input) => {
    await ensureDirs();
    const safeTemplate = safeName(input.template);
    const template = await readFile(join(templatesDir(), `${safeTemplate}.md`), "utf8").catch(
      () => null,
    );
    if (template === null) return `No template named "${input.template}".`;

    // Replace {{placeholder}} tokens with the provided details block.
    const content = template.replace(/\{\{\s*details\s*\}\}/gi, input.details);

    const safe = safeName(input.name);
    await writeFile(join(docsDir(), `${safe}.md`), content, "utf8");

    const history = await readHistory();
    const entries = history[input.name] ?? [];
    entries.push({
      version: entries.length + 1,
      timestamp: new Date().toISOString(),
      summary: `Created from template "${input.template}"`,
    });
    history[input.name] = entries;
    await writeHistory(history);

    return `Created document "${input.name}" from template "${input.template}".`;
  },
});

/** View the revision history of a document. */
export const docHistory = tool({
  name: "doc_history",
  description: "View the revision history (versions, timestamps, summaries) of a document.",
  inputSchema: z.object({ name: z.string() }),
  callback: async (input) => {
    const history = await readHistory();
    const entries = history[input.name];
    if (!entries || entries.length === 0) {
      return `No revision history for "${input.name}".`;
    }
    return entries
      .map((e) => `v${e.version} (${e.timestamp}) — ${e.summary}`)
      .join("\n");
  },
});

/** All docs tools, ready to register on an agent. */
export const docsTools = [
  listDocs,
  readDoc,
  writeDoc,
  deleteDoc,
  listTemplates,
  readTemplate,
  createFromTemplate,
  docHistory,
];
