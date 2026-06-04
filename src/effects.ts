/**
 * Effect-dispatch registry — a typed map of named, host-provided UX effects that
 * an autonomous actor can invoke. Agent tools and flow nodes both reduce to
 * "invoke effect X with params" — this is the shared dispatch primitive.
 *
 * The host owns the effect implementations (show a toast, navigate, open a
 * modal, await a human confirm). FlowRunnerUx turns each invocation into a flow
 * executor; an agent bridge can turn each into an MCP tool. Either way, every
 * dispatch optionally broadcasts an {@link AutoActivityEvent} so presence /
 * logging / undo layers compose for free.
 */
import { emitActivity, type AutoActivityEvent, type AutoActorKind } from "./activity";

/** A host-provided effect. Receives JSON-friendly params; may be async. */
export type EffectHandler<P = any, R = any> = (params: P) => R | Promise<R>;

/** Map of effect name → handler. */
export type EffectRegistry = Record<string, EffectHandler>;

export type DispatchActor = {
  id: string;
  name?: string;
  color?: string;
  /** "agent" | "flow"; defaults to "flow" for FlowRunnerUx. */
  source?: AutoActorKind;
};

export type EffectDispatcherOptions = {
  /** Identifies the actor for the activity events each dispatch emits. */
  actor?: DispatchActor;
  /** Broadcast an activity event per dispatch. Default true. */
  broadcast?: boolean;
  /** Target kind stamped on emitted activity. Default "ux". */
  targetKind?: string;
};

export type EffectDispatcher = {
  /** Invoke a registered effect by name. Throws if it isn't registered. */
  dispatch: <R = unknown>(name: string, params?: unknown) => Promise<R>;
  /** Whether an effect name is registered. */
  has: (name: string) => boolean;
  /** All registered effect names. */
  names: () => string[];
};

/**
 * Build a dispatcher over a set of effects. Each successful dispatch emits an
 * activity event (`action: "ux_<name>"`) unless `broadcast` is false.
 */
export function createEffectDispatcher(
  effects: EffectRegistry,
  options: EffectDispatcherOptions = {},
): EffectDispatcher {
  const { actor, broadcast = true, targetKind = "ux" } = options;

  return {
    async dispatch(name, params) {
      const handler = effects[name];
      if (!handler) {
        throw new Error(`No effect "${name}" registered (have: ${Object.keys(effects).join(", ") || "none"})`);
      }
      const result = await handler(params);
      if (broadcast) {
        const event: AutoActivityEvent = {
          agentId: actor?.id ?? "flow",
          agentName: actor?.name,
          agentColor: actor?.color,
          target: { kind: targetKind, label: name },
          action: `ux_${name}`,
          timestamp: stamp(),
          source: actor?.source ?? "flow",
          meta: isRecord(params) ? params : params === undefined ? undefined : { value: params },
        };
        emitActivity(event);
      }
      return result as never;
    },
    has: (name) => name in effects,
    names: () => Object.keys(effects),
  };
}

// Date.now is fine here (runtime browser/node code, not a workflow sandbox).
function stamp(): number {
  return Date.now();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
