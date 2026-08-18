/**
 * Local ModelHitch bridge launcher.
 *
 * Run with: bun run bridge
 *
 * Starts an OpenAI-compatible bridge on 127.0.0.1:3939/v1 that holds your
 * API keys locally (env vars / keystore) and routes to any provider/model.
 * Strands agents in the harness point their OpenAIModel baseURL here.
 *
 * Keys are resolved locally and never sent to a backend. With no keys set,
 * the built-in `mock` provider serves deterministic responses so the harness
 * works end-to-end with zero configuration.
 */
import { createModelHitchServer, mockProvider } from "modelhitch";
import { BRIDGE_URL } from "./config";

const port = Number(process.env.MODELHITCH_PORT ?? 3939);
const host = process.env.MODELHITCH_HOST ?? "127.0.0.1";

const server = createModelHitchServer({
  // Start with the deterministic mock provider so the harness runs with no keys.
  // Add real providers (openai, anthropic, opencode-zen, ...) here as you add keys.
  providers: [mockProvider],
  defaultProviderId: "mock",
  defaultModel: "mock-model",
  logger: (line: string) => console.log(line),
});

const { url } = await server.listen(port, host);
console.log(`ModelHitch bridge listening at ${url} (${BRIDGE_URL})`);
console.log("  mock provider active — set real provider keys to route real models.");
