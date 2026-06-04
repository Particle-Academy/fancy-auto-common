/**
 * @particle-academy/fancy-auto-common — shared headless primitives for
 * autonomous UX drivers (agent-integrations + fancy-flow's FlowRunnerUx).
 *
 * Core entry: **zero React**. Import `@particle-academy/fancy-auto-common/react`
 * for the `useActivity` hook.
 */
export {
  emitActivity,
  onActivity,
  readActivityHistory,
  resetActivityRegistry,
  type AutoActivityEvent,
  type AutoActivityListener,
  type AutoActorKind,
  type AutoTarget,
  type AutoTargetKind,
  type ActivityFilter,
} from "./activity";

export {
  createEffectDispatcher,
  type EffectHandler,
  type EffectRegistry,
  type EffectDispatcher,
  type EffectDispatcherOptions,
  type DispatchActor,
} from "./effects";

export {
  pushUndoEntry,
  undoOne,
  redoOne,
  readHistory,
  clearStack,
  resetAllUndoStacks,
  type UndoEntry,
} from "./undo";

export {
  type PresenceParticipant,
  type PresenceCursor,
} from "./presence";
