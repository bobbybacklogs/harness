/**
 * Verifies the Docs tools persist correctly under HARNESS_HOME.
 * Run with: bun run tools:docs
 */
import {
  listDocs,
  readDoc,
  writeDoc,
  deleteDoc,
  listTemplates,
  readTemplate,
  createFromTemplate,
  docHistory,
} from "../src/tools/docs-tools";
import { HARNESS_HOME } from "../src/config";

console.log(`HARNESS_HOME = ${HARNESS_HOME}`);

// Templates (seeded from repo)
console.log("\n-- listTemplates --");
console.log(await listTemplates.invoke({}));
console.log("-- readTemplate (proposal) --");
console.log(await readTemplate.invoke({ name: "proposal" }));

// Documents
console.log("\n-- writeDoc --");
console.log(await writeDoc.invoke({ name: "acme-proposal", content: "# Proposal for Acme\n\nBuild a website.", summary: "Initial draft" }));
console.log(await writeDoc.invoke({ name: "acme-proposal", content: "# Proposal for Acme\n\nBuild a website and brand kit.", summary: "Added brand kit" }));
console.log("-- listDocs --");
console.log(await listDocs.invoke({}));
console.log("-- readDoc --");
console.log(await readDoc.invoke({ name: "acme-proposal" }));
console.log("-- docHistory --");
console.log(await docHistory.invoke({ name: "acme-proposal" }));

// Create from template
console.log("\n-- createFromTemplate --");
console.log(await createFromTemplate.invoke({ template: "invoice", name: "invoice-001", details: "Acme Corp — Website build" }));
console.log("-- readDoc (invoice-001) --");
console.log(await readDoc.invoke({ name: "invoice-001" }));

// Delete
console.log("\n-- deleteDoc --");
console.log(await deleteDoc.invoke({ name: "invoice-001" }));
console.log("-- listDocs after delete --");
console.log(await listDocs.invoke({}));
