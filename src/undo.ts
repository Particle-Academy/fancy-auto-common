/**
 * Generic undo/redo stack keyed by actor id (an agent id, or a flow-run id).
 * Each entry holds `undo` (reverse), `redo` (re-apply), and a human `label`.
 *
 * Drivers register entries after a successful mutation; the actor-scoped stacks
 * let multiple agents / flow runs rewind independently. Historically this lived
 * in agent-integrations as a per-`agentId` stack — the API and `agentId`
 * parameter name are preserved so it re-exports there with zero churn.
 */

export type UndoEntry = {
  /** Wall-clock ms. */
  timestamp: number;
  /** Driver/bridge id (e.g. "whiteboard", "form:signup", "flow"). */
  bridgeId: string;
  /** Action that produced the entry (tool name / effect name). */
  action: string;
  /** Short human label, e.g. `Added sticky n_abc`. */
  label: string;
  /** Reverse the action. */
  undo: () => void | Promise<void>;
  /** Re-apply the action (used when redoing after an undo). */
  redo: () => void | Promise<void>;
};

type Stack = { past: UndoEntry[]; future: UndoEntry[] };

const stacks = new Map<string, Stack>();
const CAP = 200;

function getStack(actorId: string): Stack {
  let s = stacks.get(actorId);
  if (!s) {
    s = { past: [], future: [] };
    stacks.set(actorId, s);
  }
  return s;
}

/** Push a new undo entry on the actor's stack. Clears the redo (future) stack. */
export function pushUndoEntry(agentId: string, entry: UndoEntry): void {
  const s = getStack(agentId);
  s.past.push(entry);
  if (s.past.length > CAP) s.past.splice(0, s.past.length - CAP);
  s.future.length = 0;
}

/** Pop and undo the most recent entry. Returns the entry that ran, or null. */
export async function undoOne(agentId: string): Promise<UndoEntry | null> {
  const s = getStack(agentId);
  const entry = s.past.pop();
  if (!entry) return null;
  await entry.undo();
  s.future.push(entry);
  return entry;
}

/** Re-apply the most recently undone entry. Returns it, or null if no future. */
export async function redoOne(agentId: string): Promise<UndoEntry | null> {
  const s = getStack(agentId);
  const entry = s.future.pop();
  if (!entry) return null;
  await entry.redo();
  s.past.push(entry);
  return entry;
}

/** Read the past stack (oldest first). */
export function readHistory(agentId: string): UndoEntry[] {
  return getStack(agentId).past.slice();
}

/** Wipe an actor's stacks. */
export function clearStack(agentId: string): void {
  stacks.delete(agentId);
}

/** Test/teardown helper. */
export function resetAllUndoStacks(): void {
  stacks.clear();
}
