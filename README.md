# @particle-academy/fancy-auto-common

[![Fancified](art/fancified.svg)](https://particle.academy)

Shared **headless** primitives for autonomous UX drivers — the common core
behind [`agent-integrations`](https://github.com/Particle-Academy/agent-integrations)
(agent-driven UX) and [`fancy-flow`](https://github.com/Particle-Academy/fancy-flow)'s
`FlowRunnerUx` (flow-driven UX).

Zero runtime dependencies. The core entry is **React-free**; the optional
`/react` entry adds a subscription hook.

```bash
npm install @particle-academy/fancy-auto-common
```

## What's in it

- **Activity bus** — `emitActivity` / `onActivity` / `readActivityHistory`. The
  event type, `AutoActivityEvent`, carries a `source: "agent" | "flow"`
  discriminant and is a back-compat superset of agent-integrations' historical
  `AgentActivityEvent` (same flat `agentId` / `agentName` / `agentColor` fields),
  so presence cursors, highlights, and screen-presence badges work for agents
  and flow runs alike.
- **Effect-dispatch registry** — `createEffectDispatcher(effects, { actor })`.
  A typed map of named, host-provided UX effects (toast, navigate, confirm, …).
  Agent tools and flow nodes both reduce to "invoke effect X with params"; every
  dispatch optionally broadcasts an activity event so presence / logging / undo
  compose for free.
- **Per-actor undo stack** — `pushUndoEntry` / `undoOne` / `redoOne`, keyed by
  actor id so multiple agents or flow runs rewind independently.
- **Presence types** — `PresenceParticipant`, `PresenceCursor`.

## Core (React-free)

```ts
import { createEffectDispatcher, onActivity } from "@particle-academy/fancy-auto-common";

const dispatch = createEffectDispatcher(
  { toast: ({ title }) => showToast(title) },
  { actor: { id: "run-1", source: "flow" } },
);

onActivity((e) => console.log(e.action), { source: "flow" });
await dispatch.dispatch("toast", { title: "Hello from a flow" }); // emits ux_toast activity
```

## React

```ts
import { useActivity } from "@particle-academy/fancy-auto-common/react";

const { events, latest } = useActivity({ source: "flow" });
```

MIT © Particle Academy

---

## ⭐ Star Fancy UI

If this package is useful to you, a quick ⭐ on the repo really helps us build a better kit. Thank you!
