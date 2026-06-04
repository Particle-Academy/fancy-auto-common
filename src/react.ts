/**
 * React layer — a subscription hook over the activity bus. Separate entry so the
 * core stays React-free. Import from `@particle-academy/fancy-auto-common/react`.
 */
import { useEffect, useState } from "react";
import {
  onActivity,
  readActivityHistory,
  type ActivityFilter,
  type AutoActivityEvent,
} from "./activity";

/**
 * useActivity — React subscription to the in-process activity stream.
 *
 * Returns a capped scrollback of recent events matching the filter plus the
 * latest event (handy for transient highlights). Works for agent activity,
 * flow activity, or both (filter by `source`).
 */
export function useActivity(
  filter?: ActivityFilter,
  options: { capacity?: number } = {},
): { events: AutoActivityEvent[]; latest: AutoActivityEvent | null } {
  const cap = options.capacity ?? 50;
  const [events, setEvents] = useState<AutoActivityEvent[]>(() => readActivityHistory(filter).slice(-cap));

  useEffect(() => {
    setEvents(readActivityHistory(filter).slice(-cap));
    return onActivity((event) => {
      setEvents((prev) => {
        const next = prev.length >= cap ? prev.slice(prev.length - cap + 1) : prev.slice();
        next.push(event);
        return next;
      });
    }, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.agentId, filter?.screenId, filter?.kind, filter?.source, cap]);

  return { events, latest: events.length > 0 ? events[events.length - 1] : null };
}

/**
 * useActivityForScreen — convenience wrapper that filters by screen id and
 * exposes an `isActive` flag that fades after the event's ttl. Drives
 * "an actor is here" badges in fancy-screens-based shells.
 */
export function useActivityForScreen(
  screenId: string,
  options: { capacity?: number } = {},
): { events: AutoActivityEvent[]; latest: AutoActivityEvent | null; isActive: boolean } {
  const { events, latest } = useActivity({ screenId }, options);
  const fadeAfter = latest?.ttlMs ?? 1500;
  const [isActive, setActive] = useState(false);

  useEffect(() => {
    if (!latest) {
      setActive(false);
      return;
    }
    setActive(true);
    const timer = setTimeout(() => setActive(false), fadeAfter);
    return () => clearTimeout(timer);
  }, [latest, fadeAfter]);

  return { events, latest, isActive };
}
