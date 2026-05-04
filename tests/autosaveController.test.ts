import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	AutosaveController,
	type AutosaveState,
	type ClearTimeoutLike,
	type SetTimeoutLike,
} from "@/client/autosaveController";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeFakeFetch(
	responses: Array<{ ok: boolean; status?: number } | "reject">,
) {
	let callIndex = 0;
	const calls: Array<{ url: string; body: string }> = [];

	const fakeFetch = vi.fn(async (url: string, init: RequestInit) => {
		calls.push({ url, body: init.body as string });
		const resp = responses[callIndex++] ?? { ok: true };
		if (resp === "reject") {
			return Promise.reject(new Error("Network error"));
		}
		return { ok: resp.ok, status: resp.status ?? (resp.ok ? 204 : 500) };
	});

	return { fakeFetch, calls };
}

/** Typed wrappers so Node/vi timers satisfy our injected types */
function timerDeps() {
	const st: SetTimeoutLike = (fn, ms) =>
		globalThis.setTimeout(fn, ms) as unknown as number;
	const ct: ClearTimeoutLike = (id) =>
		globalThis.clearTimeout(
			id as unknown as Parameters<typeof globalThis.clearTimeout>[0],
		);
	return { setTimeout: st, clearTimeout: ct };
}

interface ControllerFixture {
	controller: AutosaveController;
	fakeFetch: ReturnType<typeof makeFakeFetch>["fakeFetch"];
	fetchCalls: ReturnType<typeof makeFakeFetch>["calls"];
	states: AutosaveState[];
}

function makeController(
	responses: Array<{ ok: boolean; status?: number } | "reject"> = [
		{ ok: true },
	],
	slug = "test-slug",
): ControllerFixture {
	const { fakeFetch, calls: fetchCalls } = makeFakeFetch(responses);
	const states: AutosaveState[] = [];

	const controller = new AutosaveController({
		fetch: fakeFetch,
		...timerDeps(),
		dateNow: () => 1_700_000_000_000,
		url: `/api/snips/${slug}`,
		debounceMs: 800,
	});

	controller.subscribe((s) => states.push(s));

	return { controller, fakeFetch, fetchCalls, states };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AutosaveController", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	it("initial state is idle and subscribe gets current state immediately", () => {
		const { states } = makeController();
		expect(states).toHaveLength(1);
		expect(states[0]).toEqual({ status: "idle" });
	});

	// -------------------------------------------------------------------------
	it("onChange transitions Idle → Dirty and does not fire fetch before debounce", () => {
		const { controller, fakeFetch, states } = makeController();

		controller.onChange("hello");

		expect(states.at(-1)).toEqual({ status: "dirty" });
		expect(fakeFetch).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	it("debounce coalescing: rapid onChange calls result in exactly one fetch with the latest content", async () => {
		const { controller, fakeFetch, fetchCalls } = makeController([
			{ ok: true },
		]);

		controller.onChange("a");
		controller.onChange("ab");
		controller.onChange("abc");

		// Still before debounce fires — no fetch yet
		expect(fakeFetch).not.toHaveBeenCalled();

		// Advance past debounce window
		await vi.advanceTimersByTimeAsync(800);

		expect(fakeFetch).toHaveBeenCalledTimes(1);
		const body = JSON.parse(fetchCalls[0].body);
		expect(body.content).toBe("abc");
	});

	// -------------------------------------------------------------------------
	it("full state-transition sequence on success: Idle → Dirty → Saving → Saved", async () => {
		const { controller, states } = makeController([{ ok: true }]);

		controller.onChange("hello");
		await vi.advanceTimersByTimeAsync(800);
		// Wait for the microtask (Promise resolution) to complete
		await Promise.resolve();

		const statuses = states.map((s) => s.status);
		expect(statuses).toEqual(["idle", "dirty", "saving", "saved"]);
	});

	// -------------------------------------------------------------------------
	it("saved state carries a wall-clock timestamp", async () => {
		const { controller, states } = makeController([{ ok: true }]);

		controller.onChange("hello");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		const savedState = states.find((s) => s.status === "saved");
		expect(savedState).toBeDefined();
		expect(savedState).toEqual({
			status: "saved",
			timestamp: 1_700_000_000_000,
		});
	});

	// -------------------------------------------------------------------------
	it("transition to Offline on fetch failure (rejected promise)", async () => {
		const { controller, states } = makeController(["reject"]);

		controller.onChange("hello");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		const statuses = states.map((s) => s.status);
		expect(statuses).toContain("saving");
		expect(statuses.at(-1)).toBe("offline");
	});

	// -------------------------------------------------------------------------
	it("transition to Offline on non-ok response", async () => {
		const { controller, states } = makeController([{ ok: false }]);

		controller.onChange("hello");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({ status: "offline" });
	});

	// -------------------------------------------------------------------------
	it("retry-on-next-change: Offline → Dirty → Saving → Saved after recovery", async () => {
		// First attempt fails, second succeeds
		const { controller, states } = makeController([
			{ ok: false },
			{ ok: true },
		]);

		controller.onChange("v1");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		// Now offline
		expect(states.at(-1)).toEqual({ status: "offline" });

		// Next change re-triggers
		controller.onChange("v2");
		expect(states.at(-1)).toEqual({ status: "dirty" });

		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({
			status: "saved",
			timestamp: 1_700_000_000_000,
		});
	});

	// -------------------------------------------------------------------------
	it("no concurrent in-flight saves: onChange during Saving queues pending, not a second fetch", async () => {
		let resolveFirst!: (v: { ok: boolean; status: number }) => void;
		const firstFetchPromise = new Promise<{ ok: boolean; status: number }>(
			(res) => {
				resolveFirst = res;
			},
		);

		const fakeFetch = vi.fn(
			(_url: string, _init: RequestInit) => firstFetchPromise,
		);
		const states: AutosaveState[] = [];

		const controller = new AutosaveController({
			fetch: fakeFetch,
			...timerDeps(),
			dateNow: () => 1_700_000_000_000,
			url: "/api/snips/test",
			debounceMs: 800,
		});
		controller.subscribe((s) => states.push(s));

		// First change — triggers debounce then save
		controller.onChange("first");
		await vi.advanceTimersByTimeAsync(800);

		expect(fakeFetch).toHaveBeenCalledTimes(1);
		expect(states.at(-1)).toEqual({ status: "saving" });

		// Change while saving — should NOT trigger a second fetch
		controller.onChange("second");
		expect(fakeFetch).toHaveBeenCalledTimes(1); // still just one

		// Resolve the first request
		resolveFirst({ ok: true, status: 204 });
		await Promise.resolve();
		await Promise.resolve(); // allow chained .then to run

		// Now a second fetch should fire automatically for the pending content
		expect(fakeFetch).toHaveBeenCalledTimes(2);
		const secondBody = JSON.parse(fakeFetch.mock.calls[1][1].body as string);
		expect(secondBody.content).toBe("second");
	});

	// -------------------------------------------------------------------------
	it("Saved state → onChange restarts debounce and transitions through Dirty → Saving → Saved again", async () => {
		const { controller, states } = makeController([{ ok: true }, { ok: true }]);

		controller.onChange("first");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({
			status: "saved",
			timestamp: 1_700_000_000_000,
		});

		controller.onChange("second");
		expect(states.at(-1)).toEqual({ status: "dirty" });

		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({
			status: "saved",
			timestamp: 1_700_000_000_000,
		});
	});

	// -------------------------------------------------------------------------
	it("debounce timer is reset on rapid changes so only one request fires", async () => {
		const { fakeFetch: outerFetch } = makeController([{ ok: true }]);

		// Use a separate controller with rapid changes
		const { fakeFetch: f2 } = makeFakeFetch([{ ok: true }]);
		const c2 = new AutosaveController({
			fetch: f2,
			...timerDeps(),
			dateNow: () => 0,
			url: "/api/snips/x",
			debounceMs: 800,
		});

		for (let i = 0; i < 5; i++) {
			c2.onChange(`change-${i}`);
			// Advance timers a bit but not past debounce
			vi.advanceTimersByTime(100);
		}

		// Now advance past the last debounce window
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		// Only one fetch should have occurred for the inner controller
		expect(f2).toHaveBeenCalledTimes(1);

		// The outer controller's fetch was never called
		expect(outerFetch).toHaveBeenCalledTimes(0);
	});

	// -------------------------------------------------------------------------
	it("unsubscribe stops listener from receiving updates", async () => {
		const { controller, states } = makeController([{ ok: true }]);
		// states already has the initial 'idle'

		const extraStates: AutosaveState[] = [];
		const unsub = controller.subscribe((s) => extraStates.push(s));

		controller.onChange("hi");
		unsub(); // unsubscribe before debounce fires

		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		// extraStates should have: initial idle + dirty; but NOT saving/saved
		expect(extraStates.map((s) => s.status)).toEqual(["idle", "dirty"]);
		// main states array still receives all updates
		expect(states.map((s) => s.status)).toContain("saved");
	});

	// -------------------------------------------------------------------------
	it("413 response transitions to too_large state", async () => {
		const { controller, states } = makeController([{ ok: false, status: 413 }]);

		controller.onChange("huge content");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		const statuses = states.map((s) => s.status);
		expect(statuses).toContain("saving");
		expect(statuses.at(-1)).toBe("too_large");
	});

	// -------------------------------------------------------------------------
	it("401 response transitions to locked state", async () => {
		const { controller, states } = makeController([{ ok: false, status: 401 }]);

		controller.onChange("protected edit");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({ status: "locked" });
	});

	// -------------------------------------------------------------------------
	it("includes a pending initial password on the next save only", async () => {
		const { fakeFetch, calls } = makeFakeFetch([{ ok: true }, { ok: true }]);
		const c = new AutosaveController({
			fetch: fakeFetch,
			...timerDeps(),
			dateNow: () => 0,
			url: "/api/snips/x",
			debounceMs: 800,
		});

		c.setInitialPassword("open-sesame");
		c.onChange("first");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();
		c.onChange("second");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(JSON.parse(calls[0].body).password).toBe("open-sesame");
		expect("password" in JSON.parse(calls[1].body)).toBe(false);
	});

	// -------------------------------------------------------------------------
	it("includes clientId in PUT body when configured", async () => {
		const { fakeFetch, calls } = makeFakeFetch([{ ok: true }]);
		const c = new AutosaveController({
			fetch: fakeFetch,
			...timerDeps(),
			dateNow: () => 0,
			url: "/api/snips/x",
			debounceMs: 800,
			clientId: "tab-42",
		});

		c.onChange("hello");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(calls).toHaveLength(1);
		const body = JSON.parse(calls[0].body);
		expect(body.clientId).toBe("tab-42");
		expect(body.content).toBe("hello");
	});

	// -------------------------------------------------------------------------
	it("body has no clientId field when none was configured", async () => {
		const { controller, fetchCalls } = makeController([{ ok: true }]);
		controller.onChange("hi");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		const body = JSON.parse(fetchCalls[0].body);
		expect("clientId" in body).toBe(false);
	});

	// -------------------------------------------------------------------------
	it("flush(): when dirty, fires PUT immediately bypassing debounce", async () => {
		const { controller, fakeFetch, fetchCalls } = makeController([
			{ ok: true },
		]);

		controller.onChange("immediate");
		expect(fakeFetch).not.toHaveBeenCalled();

		controller.flush();
		// No timer advancement
		expect(fakeFetch).toHaveBeenCalledTimes(1);
		const body = JSON.parse(fetchCalls[0].body);
		expect(body.content).toBe("immediate");
	});

	// -------------------------------------------------------------------------
	it("flush(): when idle (no changes), is a no-op", () => {
		const { controller, fakeFetch } = makeController();
		controller.flush();
		expect(fakeFetch).not.toHaveBeenCalled();
	});

	// -------------------------------------------------------------------------
	it("flush(): when already saving, queues nothing extra", async () => {
		let resolveFirst!: (v: { ok: boolean; status: number }) => void;
		const firstFetch = new Promise<{ ok: boolean; status: number }>((res) => {
			resolveFirst = res;
		});
		const fakeFetch = vi.fn(() => firstFetch);

		const c = new AutosaveController({
			fetch: fakeFetch,
			...timerDeps(),
			dateNow: () => 0,
			url: "/api/snips/x",
			debounceMs: 800,
		});

		c.onChange("first");
		await vi.advanceTimersByTimeAsync(800);
		expect(fakeFetch).toHaveBeenCalledTimes(1);

		c.flush();
		expect(fakeFetch).toHaveBeenCalledTimes(1);

		resolveFirst({ ok: true, status: 204 });
		await Promise.resolve();
		await Promise.resolve();
	});

	// -------------------------------------------------------------------------
	it("too_large → onChange re-tries; recovers to Saved when content becomes valid", async () => {
		// First attempt returns 413, second succeeds
		const { controller, states } = makeController([
			{ ok: false, status: 413 },
			{ ok: true, status: 204 },
		]);

		controller.onChange("huge");
		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({ status: "too_large" });

		// User reduces content — next onChange re-triggers save
		controller.onChange("small");
		expect(states.at(-1)).toEqual({ status: "dirty" });

		await vi.advanceTimersByTimeAsync(800);
		await Promise.resolve();

		expect(states.at(-1)).toEqual({
			status: "saved",
			timestamp: 1_700_000_000_000,
		});
	});
});

describe("AutosaveController — enabled flag", () => {
	function makeController(opts: { enabled?: boolean } = {}) {
		const timeouts: Array<{ fn: () => void; ms: number }> = [];
		const fakeSetTimeout = vi.fn((fn: () => void, ms: number) => {
			timeouts.push({ fn, ms });
			return timeouts.length;
		});
		const fakeClearTimeout = vi.fn();
		const states: AutosaveState[] = [];

		const { fakeFetch } = makeFakeFetch([{ ok: true }]);

		const controller = new AutosaveController({
			fetch: fakeFetch,
			setTimeout: fakeSetTimeout,
			clearTimeout: fakeClearTimeout,
			dateNow: () => 0,
			url: "/api/snips/test",
			...opts,
		});

		controller.subscribe((s) => states.push(s));
		return { controller, states, timeouts, fakeFetch };
	}

	it("defaults to enabled (backward compatible)", () => {
		const { controller, states } = makeController();
		controller.onChange("hello");
		expect(states.at(-1)).toEqual({ status: "dirty" });
	});

	it("when disabled, onChange sets dirty but does not start timer", () => {
		const { controller, states, timeouts } = makeController({ enabled: false });
		controller.onChange("hello");

		expect(states.at(-1)).toEqual({ status: "dirty" });
		expect(timeouts).toHaveLength(0);
	});

	it("when disabled, flush still triggers immediate save", async () => {
		const { controller, states, fakeFetch } = makeController({
			enabled: false,
		});
		controller.onChange("hello");
		controller.flush();

		expect(states.at(-1)).toEqual({ status: "saving" });
		expect(fakeFetch).toHaveBeenCalledTimes(1);

		await Promise.resolve();
		expect(states.at(-1)).toEqual({ status: "saved", timestamp: 0 });
	});

	it("when disabled, multiple onChange calls do not start timer", () => {
		const { controller, timeouts } = makeController({ enabled: false });
		controller.onChange("a");
		controller.onChange("b");
		controller.onChange("c");

		expect(timeouts).toHaveLength(0);
	});
});
