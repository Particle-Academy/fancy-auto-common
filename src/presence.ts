/**
 * Presence types — a participant in a shared surface, whether a human, an
 * agent, or a flow run. Hosts render these as cursors / "X is here" badges.
 */
import type { AutoActorKind } from "./activity";

export type PresenceParticipant = {
  /** Stable id (agent id, flow-run id, or user id). */
  id: string;
  /** Display name. */
  name?: string;
  /** CSS color for the cursor / highlight. */
  color?: string;
  /** What kind of participant this is. */
  source?: AutoActorKind | "human";
};

/** A live pointer position in surface (world) coordinates. */
export type PresenceCursor = PresenceParticipant & {
  x: number;
  y: number;
};
