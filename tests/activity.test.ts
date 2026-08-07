import { afterEach, describe, expect, it, vi } from "vitest";
import {
    emitActivity,
    onActivity,
    readActivityHistory,
    resetActivityRegistry,
    type AutoActivityEvent,
} from "../src/activity";

// The registry is module-level singleton state. Without this, one test's
// listeners fire during the next test's emits and history accumulates across
// the file — the failure looks like a bug in whichever test happens to run
// second.
afterEach(() => resetActivityRegistry());

const event = (over: Partial<AutoActivityEvent> = {}): AutoActivityEvent => ({
    agentId: "a1",
    target: { kind: "grid", label: "Sheet" },
    action: "paint",
    timestamp: 1,
    source: "agent",
    ...over,
});

describe("activity registry", () => {
    it("delivers an emitted event to every listener, synchronously", () => {
        // Synchronous delivery is the contract presence and coaching layers
        // rely on: they read state immediately after a mutation, not on the
        // next tick.
        const a = vi.fn();
        const b = vi.fn();
        onActivity(a);
        onActivity(b);

        emitActivity(event());

        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
    });

    it("stops delivering once unsubscribed", () => {
        const seen = vi.fn();
        const off = onActivity(seen);

        emitActivity(event());
        off();
        emitActivity(event());

        expect(seen).toHaveBeenCalledTimes(1);
    });

    it("unsubscribes only the listener that asked, even when filtered", () => {
        // onActivity wraps a filtered listener before storing it, so the
        // returned unsubscribe has to close over the WRAPPER. Returning
        // something that deletes the raw listener would be a silent no-op and
        // the listener would keep firing forever.
        const kept = vi.fn();
        const dropped = vi.fn();
        onActivity(kept, { source: "agent" });
        const off = onActivity(dropped, { source: "agent" });

        off();
        emitActivity(event());

        expect(kept).toHaveBeenCalledTimes(1);
        expect(dropped).not.toHaveBeenCalled();
    });

    it("filters on each supplied key and ignores the ones omitted", () => {
        const byAgent = vi.fn();
        const byScreen = vi.fn();
        const byKind = vi.fn();
        onActivity(byAgent, { agentId: "a1" });
        onActivity(byScreen, { screenId: "s9" });
        onActivity(byKind, { kind: "grid" });

        emitActivity(event({ agentId: "a1", target: { kind: "grid", label: "x", screenId: "s1" } }));

        expect(byAgent).toHaveBeenCalledTimes(1);
        expect(byKind).toHaveBeenCalledTimes(1);
        expect(byScreen).not.toHaveBeenCalled();
    });

    it("keeps history oldest-first and filters it the same way", () => {
        emitActivity(event({ agentId: "a1", action: "first" }));
        emitActivity(event({ agentId: "a2", action: "second" }));

        expect(readActivityHistory().map((e) => e.action)).toEqual(["first", "second"]);
        expect(readActivityHistory({ agentId: "a2" }).map((e) => e.action)).toEqual(["second"]);
    });

    it("hands back a copy of history, not the live array", () => {
        // A caller that pushes into the returned array must not be able to
        // corrupt the registry's own record.
        emitActivity(event());
        const first = readActivityHistory();
        first.push(event({ action: "injected" }));

        expect(readActivityHistory()).toHaveLength(1);
    });

    it("caps history at 200 and drops the oldest", () => {
        // The cap is what stops a long-lived page from growing without bound.
        // Off-by-one here means either a leak or a lost event.
        for (let i = 0; i < 205; i++) emitActivity(event({ action: `e${i}` }));

        const h = readActivityHistory();
        expect(h).toHaveLength(200);
        expect(h[0]!.action).toBe("e5");
        expect(h.at(-1)!.action).toBe("e204");
    });

    it("resets listeners and history together", () => {
        const seen = vi.fn();
        onActivity(seen);
        emitActivity(event());

        resetActivityRegistry();
        emitActivity(event());

        expect(seen).toHaveBeenCalledTimes(1);
        expect(readActivityHistory()).toHaveLength(1);
    });
});
