import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HARNESS_HOME } from "../config";

/**
 * Ops tools — the business-operations surface for a 1-3 person SMB.
 *
 * These are the harness's own Strands-native tools. They give the Ops agent
 * real, local capabilities: a lightweight SOP store, a task/action log, and
 * a notes store. Everything persists under HARNESS_HOME so the "business"
 * state survives across sessions.
 */

const sopDir = () => join(HARNESS_HOME, "sops");
const notesDir = () => join(HARNESS_HOME, "notes");
const tasksFile = () => join(HARNESS_HOME, "tasks.json");

async function ensureDirs() {
  await mkdir(sopDir(), { recursive: true });
  await mkdir(notesDir(), { recursive: true });
}

/** List all stored SOPs. */
export const listSops = tool({
  name: "list_sops",
  description: "List all stored standard operating procedures (SOPs).",
  inputSchema: z.object({}),
  callback: async () => {
    await ensureDirs();
    const entries = await readdir(sopDir()).catch(() => []);
    return entries.filter((e) => e.endsWith(".md")).join("\n") || "(no SOPs yet)";
  },
});

/** Read a single SOP by name. */
export const readSop = tool({
  name: "read_sop",
  description: "Read the full text of a stored SOP by name (without .md).",
  inputSchema: z.object({ name: z.string() }),
  callback: async (input) => {
    await ensureDirs();
    const safe = input.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    return await readFile(join(sopDir(), `${safe}.md`), "utf8").catch(
      () => `No SOP named "${input.name}".`,
    );
  },
});

/** Save (create or overwrite) an SOP. */
export const saveSop = tool({
  name: "save_sop",
  description: "Create or overwrite an SOP by name with the given markdown content.",
  inputSchema: z.object({ name: z.string(), content: z.string() }),
  callback: async (input) => {
    await ensureDirs();
    const safe = input.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    await writeFile(join(sopDir(), `${safe}.md`), input.content, "utf8");
    return `Saved SOP "${input.name}".`;
  },
});

/** Append a note to the notes store. */
export const addNote = tool({
  name: "add_note",
  description: "Append a dated note to the business notes store.",
  inputSchema: z.object({ note: z.string() }),
  callback: async (input) => {
    await ensureDirs();
    const stamp = new Date().toISOString();
    await writeFile(join(notesDir(), `${Date.now()}.md`), `# ${stamp}\n\n${input.note}\n`, "utf8");
    return "Note saved.";
  },
});

/** List all notes. */
export const listNotes = tool({
  name: "list_notes",
  description: "List all saved business notes.",
  inputSchema: z.object({}),
  callback: async () => {
    await ensureDirs();
    const entries = await readdir(notesDir()).catch(() => []);
    return entries.filter((e) => e.endsWith(".md")).join("\n") || "(no notes yet)";
  },
});

interface Task {
  id: string;
  title: string;
  status: "open" | "done";
  createdAt: string;
}

async function readTasks(): Promise<Task[]> {
  return await readFile(tasksFile(), "utf8")
    .then((t) => JSON.parse(t) as Task[])
    .catch(() => []);
}

async function writeTasks(tasks: Task[]) {
  await mkdir(HARNESS_HOME, { recursive: true });
  await writeFile(tasksFile(), JSON.stringify(tasks, null, 2), "utf8");
}

/** Add a task to the action log. */
export const addTask = tool({
  name: "add_task",
  description: "Add a task to the action log.",
  inputSchema: z.object({ title: z.string() }),
  callback: async (input) => {
    const tasks = await readTasks();
    tasks.push({
      id: String(Date.now()),
      title: input.title,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    await writeTasks(tasks);
    return `Added task: ${input.title}`;
  },
});

/** List open tasks. */
export const listTasks = tool({
  name: "list_tasks",
  description: "List all open tasks in the action log.",
  inputSchema: z.object({}),
  callback: async () => {
    const tasks = await readTasks();
    const open = tasks.filter((t) => t.status === "open");
    return open.length
      ? open.map((t) => `- [ ] ${t.title}`).join("\n")
      : "(no open tasks)";
  },
});

/** Mark a task done by id. */
export const completeTask = tool({
  name: "complete_task",
  description: "Mark a task done by its id.",
  inputSchema: z.object({ id: z.string() }),
  callback: async (input) => {
    const tasks = await readTasks();
    const t = tasks.find((x) => x.id === input.id);
    if (!t) return `No task with id "${input.id}".`;
    t.status = "done";
    await writeTasks(tasks);
    return `Completed task: ${t.title}`;
  },
});

/** All ops tools, ready to register on an agent. */
export const opsTools = [
  listSops,
  readSop,
  saveSop,
  addNote,
  listNotes,
  addTask,
  listTasks,
  completeTask,
];
