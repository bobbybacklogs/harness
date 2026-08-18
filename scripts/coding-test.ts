/**
 * Verifies the Coding tools run inside the sandboxed virtual bash.
 * Run with: bun run tools:coding
 */
import {
  runCommand,
  writeFile,
  readFile,
  listDir,
  listFiles,
} from "../src/tools/coding-tools";

console.log("== Coding tools (sandboxed virtual bash) ==");

console.log("\n-- runCommand: basic --");
console.log(await runCommand.invoke({ command: "echo hello from sandbox && pwd" }));

console.log("\n-- writeFile --");
console.log(await writeFile.invoke({ path: "/home/user/main.ts", content: "const x: number = 21;\nconsole.log('answer:', x * 2);\n" }));

console.log("\n-- readFile --");
console.log(await readFile.invoke({ path: "/home/user/main.ts" }));

console.log("\n-- listDir --");
console.log(await listDir.invoke({}));

console.log("\n-- listFiles --");
console.log(await listFiles.invoke({}));

console.log("\n-- runCommand: run the written file (ts via node? just echo) --");
console.log(await runCommand.invoke({ command: "cat /home/user/main.ts" }));

console.log("\n-- runCommand: sandbox isolation (host paths must NOT exist) --");
console.log(await runCommand.invoke({ command: "cat /etc/passwd 2>&1; echo ---; cat C:/Windows/win.ini 2>&1" }));

console.log("\n-- runCommand: network disabled (curl should not exist; exit code should be 127) --");
console.log(await runCommand.invoke({ command: "curl -s http://example.com" }));

console.log("\n-- runCommand: exit code capture --");
console.log(await runCommand.invoke({ command: "false" }));

console.log("\nAll coding tools exercised.");
