import { afterEach, describe, expect, it, vi } from "vitest";
import {
    clearStack,
    pushUndoEntry,
    readHistory,
    redoOne,
    resetAllUndoStacks,
    undoOne,
} from "../src/undo";
import { createEffectDispatcher } from "../src/effects";
import { readActivityHistory, resetActivityRegistry } from "../src/activity";

afterEach(() => {
    resetAllUndoStacks();
    resetActivityRegistry();
});

const entry = (label: string, calls: string[] = []) => ({
    label,
    undo: async () => {
        calls.push(`undo:${label}`);
    },
    redo: async () => {
        calls.push(`redo:${label}`);
    },
});

describe("undo stacks", () => {
    it("undoes the most recent entry first", async () => {
        const calls: string[] = [];
        pushUndoEntry("a1", entry("one", calls));
        pushUndoEntry("a1", entry("two", calls));

        await undoOne("a1");

        expect(calls).toEqual(["undo:two"]);
    });

    it("keeps each actor's stack separate", async () => {
        // Two agents driving the same surface must not undo each other's work.
        const calls: string[] = [];
        pushUndoEntry("a1", entry("mine", calls));
        pushUndoEntry("a2", entry("theirs", calls));

        await undoOne("a2");

        expect(calls).toEqual(["undo:theirs"]);
        expect(readHistory("a1")).toHaveLength(1);
    });

    it("returns null rather than throwing on an empty stack", async () => {
        expect(await undoOne("nobody")).toBeNull();
        expect(await redoOne("nobody")).toBeNull();
    });

    it("redoes what was undone, and round-trips back onto the past stack", async () => {
        const calls: string[] = [];
        pushUndoEntry("a1", entry("one", calls));

        await undoOne("a1");
        await redoOne("a1");

        expect(calls).toEqual(["undo:one", "redo:one"]);
        expect(readHistory("a1")).toHaveLength(1);
    });

    it("drops the redo stack when new work lands after an undo", async () => {
        // The standard editor rule: undo, then do something else, and the
        // redone-future is gone. Keeping it would let redo replay an action
        // against a state that no longer exists.
        const calls: string[] = [];
        pushUndoEntry("a1", entry("one", calls));
        await undoOne("a1");

        pushUndoEntry("a1", entry("two", calls));

        expect(await redoOne("a1")).toBeNull();
    });

    it("clears one actor without touching the others", () => {
        pushUndoEntry("a1", entry("mine"));
        pushUndoEntry("a2", entry("theirs"));

        clearStack("a1");

        expect(readHistory("a1")).toHaveLength(0);
        expect(readHistory("a2")).toHaveLength(1);
    });
});

describe("effect dispatcher", () => {
    it("runs the named effect and returns its result", async () => {
        const d = createEffectDispatcher({ toast: async (p) => `said ${String(p)}` });

        await expect(d.dispatch("toast", "hi")).resolves.toBe("said hi");
    });

    it("names what IS registered when asked for something that is not", async () => {
        // The message is the whole value of this error: a typo'd effect name is
        // otherwise indistinguishable from a handler that silently did nothing.
        const d = createEffectDispatcher({ toast: async () => null, focus: async () => null });

        await expect(d.dispatch("tost", {})).rejects.toThrow(/have: toast, focus/);
    });

    it("broadcasts one activity event per successful dispatch", async () => {
        const d = createEffectDispatcher(
            { toast: async () => null },
            { actor: { id: "agent-7", name: "Ada", source: "agent" } },
        );

        await d.dispatch("toast", { message: "hello" });

        const [e] = readActivityHistory();
        expect(e!.action).toBe("ux_toast");
        expect(e!.agentId).toBe("agent-7");
        expect(e!.meta).toEqual({ message: "hello" });
    });

    it("stays silent when broadcasting is off", async () => {
        const d = createEffectDispatcher({ toast: async () => null }, { broadcast: false });

        await d.dispatch("toast", {});

        expect(readActivityHistory()).toHaveLength(0);
    });

    it("does not broadcast when the effect throws", async () => {
        // An activity feed that reports actions which did not happen is worse
        // than no feed — a human reading it would believe the surface changed.
        const d = createEffectDispatcher({
            boom: async () => {
                throw new Error("nope");
            },
        });

        await expect(d.dispatch("boom", {})).rejects.toThrow("nope");
        expect(readActivityHistory()).toHaveLength(0);
    });

    it("reports what it can do", () => {
        const d = createEffectDispatcher({ toast: async () => null, focus: async () => null });

        expect(d.has("toast")).toBe(true);
        expect(d.has("nope")).toBe(false);
        expect(d.names()).toEqual(["toast", "focus"]);
    });
});
