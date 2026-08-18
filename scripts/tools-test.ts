/**
 * Verifies the Ops tools persist correctly under HARNESS_HOME.
 * Run with: bun run scripts/tools-test.ts
 */
import { saveSop, listSops, readSop, addNote, listNotes, addTask, listTasks, completeTask } from "../src/tools/ops-tools";
import { HARNESS_HOME } from "../src/config";

console.log(`HARNESS_HOME = ${HARNESS_HOME}`);

// SOPs
console.log("\n-- saveSop --");
console.log(await saveSop.invoke({ name: "onboarding", content: "# Onboarding\n1. Set up email\n2. Add to payroll" }));
console.log("-- listSops --");
console.log(await listSops.invoke({}));
console.log("-- readSop --");
console.log(await readSop.invoke({ name: "onboarding" }));

// Notes
console.log("\n-- addNote --");
console.log(await addNote.invoke({ note: "Smoke test note" }));
console.log("-- listNotes --");
console.log(await listNotes.invoke({}));

// Tasks
console.log("\n-- addTask --");
console.log(await addTask.invoke({ title: "File Q3 taxes" }));
console.log(await addTask.invoke({ title: "Renew domain" }));
console.log("-- listTasks --");
console.log(await listTasks.invoke({}));
console.log("-- completeTask --");
const tasks = JSON.parse(await (await import("node:fs/promises")).readFile(`${HARNESS_HOME}/tasks.json`, "utf8"));
console.log(await completeTask.invoke({ id: tasks[0].id }));
console.log("-- listTasks after complete --");
console.log(await listTasks.invoke({}));
