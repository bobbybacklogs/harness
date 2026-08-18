# Harness

**An agentic harness for solo founders.** Run your own agents — plus your Copilot personas — on any model, from a terminal. Built for the 1–3 person business: docs, SOPs, coding, and ops, all from one TUI.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Runtime](https://img.shields.io/badge/runtime-Bun_1.3+-black?logo=bun)
![Language](https://img.shields.io/badge/language-TypeScript-3178c6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it is

Harness is a terminal-based agent runner for a small business. It loads **your own agents** (Ops, Docs, Coding) plus **your Copilot personas** from `~/.copilot/agents`, and routes them through a local **ModelHitch** bridge so they run on whatever model you want — with failover for free.

- 🧑‍💼 **Ops** — SOPs, notes, and an action log for running the business
- 📄 **Docs** — proposals, contracts, marketing copy, templates, revision history
- 🛠️ **Coding** — write, run, and test code in a fully sandboxed virtual environment
- 🤖 **Your Copilot personas** — imported from `~/.copilot/agents` and runnable from the same TUI

## Quick start

```bash
bun install
bun run bridge   # start the local ModelHitch bridge (mock by default)
bun run dev      # launch the TUI
```

Tab to switch agents, type a prompt, Enter to send.

> The bridge ships with a **mock provider** so you can try everything with zero config. Point it at a real provider (OpenAI, Anthropic, Gemini, etc.) via ModelHitch to go live.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Launch the TUI |
| `bun run bridge` | Start the ModelHitch bridge on `:3939` |
| `bun run smoke` | End-to-end pipeline test (registry → agent → bridge) |
| `bun run tools:test` | Exercise the Ops tools |
| `bun run tools:docs` | Exercise the Docs tools |
| `bun run tools:coding` | Exercise the sandboxed Coding tools |
| `bun run typecheck` | Type-check the project |

## How it fits together

```
OpenTUI terminal ──► agent registry ──► Strands agents ──► ModelHitch bridge ──► any model
                        │  (own + Copilot)                    (127.0.0.1:3939)
                        └── tools (Ops / Docs / Coding)
```

- **Own agents** are Strands-native, defined in `src/agents/own/`.
- **Copilot personas** are parsed from `~/.copilot/agents/*.agent.md` and re-run as Strands agents.
- **ModelHitch** holds the keys and speaks OpenAI-compatible `/v1/chat/completions`, so Strands agents run on any routed model.
- **Coding** runs inside [just-bash](https://github.com/vercel-labs/just-bash) — an in-memory, network-off, hardened sandbox. It can't touch your real machine.

## Layout

```
src/
  index.ts            # OpenTUI entry point
  bridge.ts           # ModelHitch bridge server
  config.ts           # paths, model, bridge URL
  agents/
    registry.ts       # the agent catalog
    own/              # Ops, Docs, Coding agents
    import-copilot.ts # parse ~/.copilot/agents
  tools/              # Ops / Docs / Coding tool sets
  model/hitch.ts      # ModelHitch wiring
agents/templates/     # starter doc templates
scripts/              # smoke + tool tests
```

## License

[MIT](./LICENSE)
