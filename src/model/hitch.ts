import { ModelHitch, MemoryKeyStore } from "modelhitch";
import { BRIDGE_PROVIDER, BRIDGE_URL, DEFAULT_MODEL } from "../config";

/**
 * Model layer — wires the harness to ModelHitch.
 *
 * Two modes:
 *  1. BRIDGE (recommended): a local ModelHitch bridge server holds the keys
 *     and speaks OpenAI-compatible /v1/chat/completions. Strands agents point
 *     their OpenAIModel baseURL at this bridge, so they run on whatever model
 *     the bridge routes — with auto-mode failover for free.
 *  2. DIRECT: a ModelHitch client with a local keystore, used for quick
 *     chat/stream calls from the harness itself (not the Strands agents).
 */
export function createHitchClient() {
  return new ModelHitch({
    keystore: new MemoryKeyStore(),
    autoMode: true,
  });
}

/** A ModelHitch client pre-pointed at the local bridge. */
export function createBridgeClient() {
  return new ModelHitch({
    keystore: new MemoryKeyStore(),
    defaultProviderId: BRIDGE_PROVIDER,
    defaultModel: DEFAULT_MODEL,
    autoMode: true,
  });
}

export { BRIDGE_URL, DEFAULT_MODEL };
