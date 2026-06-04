/**
 * Activity layer — describes what an **autonomous actor** (an agent OR a flow
 * run) is doing right now and where. Both agent-integrations and fancy-flow's
 * FlowRunnerUx emit these; the in-process registry fans them out to React hooks
 * and any relay so presence indicators render across the whole app.
 *
 * The shape is a back-compat superset of agent-integrations' historical
 * `AgentActivityEvent`: the same flat `agentId` / `agentName` / `agentColor`
 * fields are kept (so `AgentActivityEvent` can alias this with zero churn), and
 * a `source` discriminant ("agent" | "flow") is added.
 */

/** Which kind of autonomous actor produced the activity. */
export type AutoActorKind = "agent" | "flow" | (string & {});

/** The surface an action affects. */
export type AutoTargetKind =
  | "whiteboard"
  | "flow"
  | "form"
  | "sheet"
  | "code"
  | "chart"
  | "scene"
  | "screens"
  | "ux"
  | "custom"
  | (string & {});

export type AutoTarget = {
  /** Which package surface the action affects. */
  kind: AutoTargetKind;
  /** Optional fancy-screens screen id, for screen-scoped UIs. */
  screenId?: string;
  /** Optional element id within the surface (sticky id, node id, field name, …). */
  elementId?: string;
  /** Free-form label the host can render (e.g. "the 'email' field"). */
  label?: string;
};

/**
 * A single activity event. The `agent*` field names are retained for backward
 * compatibility with agent-integrations consumers (cursors, highlights, screen
 * presence) — they carry whichever actor produced the event, agent or flow.
 */
export type AutoActivityEvent = {
  /** Stable identifier for the acting actor (agent id or flow-run id). */
  agentId: string;
  /** Human-friendly name (used by indicators / activity log). */
  agentName?: string;
  /** Color for cursor / highlight CSS. */
  agentColor?: string;
  /** What the actor is touching. */
  target: AutoTarget;
  /** Snake-case action verb (e.g. "whiteboard_add_sticky", "ux_toast"). */
  action: string;
  /** Wall-clock ms — when the action ran. */
  timestamp: number;
  /** Optional small structured payload describing the action's effect. */
  meta?: Record<string, unknown>;
  /** How long the activity should "stick" on the UI before fading. Default 1500. */
  ttlMs?: number;
  /** Actor source discriminant. Defaults to "agent" when omitted. */
  source?: AutoActorKind;
};

export type AutoActivityListener = (event: AutoActivityEvent) => void;

export type ActivityFilter = {
  /** Match a specific actor id. */
  agentId?: string;
  /** Match a specific screen. */
  screenId?: string;
  /** Match a target kind. */
  kind?: string;
  /** Match an actor source ("agent" | "flow"). */
  source?: AutoActorKind;
};

const HISTORY_CAP = 200;
const listeners = new Set<AutoActivityListener>();
const history: AutoActivityEvent[] = [];

/** Emit an activity event. All current listeners receive it synchronously. */
export function emitActivity(event: AutoActivityEvent): void {
  history.push(event);
  if (history.length > HISTORY_CAP) history.splice(0, history.length - HISTORY_CAP);
  for (const l of listeners) l(event);
}

/**
 * Subscribe to all events (or a filtered subset). Returns an unsubscribe
 * function. The filter checks each provided key with strict equality; omit a
 * key to ignore it.
 */
export function onActivity(listener: AutoActivityListener, filter?: ActivityFilter): () => void {
  const wrapped: AutoActivityListener = filter
    ? (e) => {
        if (matches(e, filter)) listener(e);
      }
    : listener;
  listeners.add(wrapped);
  return () => {
    listeners.delete(wrapped);
  };
}

/** Read the recent history (newest last). Optional filter. */
export function readActivityHistory(filter?: ActivityFilter): AutoActivityEvent[] {
  if (!filter) return history.slice();
  return history.filter((e) => matches(e, filter));
}

/** Wipe history + clear listeners. Test/teardown helper. */
export function resetActivityRegistry(): void {
  listeners.clear();
  history.length = 0;
}

function matches(e: AutoActivityEvent, f: ActivityFilter): boolean {
  if (f.agentId !== undefined && e.agentId !== f.agentId) return false;
  if (f.screenId !== undefined && e.target.screenId !== f.screenId) return false;
  if (f.kind !== undefined && e.target.kind !== f.kind) return false;
  if (f.source !== undefined && (e.source ?? "agent") !== f.source) return false;
  return true;
}
