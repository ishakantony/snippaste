import { describe, expect, it, vi } from "vitest";
import {
	type EventSourceLike,
	type SnipStreamHandlers,
	subscribe,
} from "@/client/snipStream";

class FakeEventSource implements EventSourceLike {
	url: string;
	closed = false;
	listeners = new Map<string, Set<(e: { data: string }) => void>>();
	onerror: (() => void) | null = null;

	constructor(url: string) {
		this.url = url;
	}

	addEventListener(name: string, fn: (e: { data: string }) => void) {
		let s = this.listeners.get(name);
		if (!s) {
			s = new Set();
			this.listeners.set(name, s);
		}
		s.add(fn);
	}

	removeEventListener(name: string, fn: (e: { data: string }) => void) {
		this.listeners.get(name)?.delete(fn);
	}

	close() {
		this.closed = true;
	}

	emit(event: string, data: unknown) {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const l of set) l({ data: JSON.stringify(data) });
	}

	emitError() {
		this.onerror?.();
	}
}

function makeHarness() {
	let createdUrl: string | null = null;
	let last: FakeEventSource | null = null;
	const factory = (url: string) => {
		createdUrl = url;
		last = new FakeEventSource(url);
		return last;
	};
	return {
		factory,
		get url() {
			return createdUrl;
		},
		get last() {
			return last as ReturnType<typeof JSON.parse>;
		},
	};
}

describe("snipStream.subscribe", () => {
	it("opens an EventSource at /api/snips/<slug>/events", () => {
		const h = makeHarness();
		subscribe("my-slug", {} as SnipStreamHandlers, {
			eventSourceFactory: h.factory,
		});
		expect(h.url).toBe("/api/snips/my-slug/events");
	});

	it("invokes onUpdate with parsed update payload", () => {
		const h = makeHarness();
		const onUpdate = vi.fn();
		subscribe("s", { onUpdate }, { eventSourceFactory: h.factory });

		h.last.emit("update", {
			content: "hello",
			updatedAt: 12345,
			clientId: "xyz",
		});

		expect(onUpdate).toHaveBeenCalledWith({
			content: "hello",
			updatedAt: 12345,
			clientId: "xyz",
		});
	});

	it("invokes onSnapshot for snapshot events", () => {
		const h = makeHarness();
		const onSnapshot = vi.fn();
		subscribe("s", { onSnapshot }, { eventSourceFactory: h.factory });

		h.last.emit("snapshot", { content: "init", updatedAt: 1 });

		expect(onSnapshot).toHaveBeenCalledWith({ content: "init", updatedAt: 1 });
	});

	it("ignores ping events silently (no error)", () => {
		const h = makeHarness();
		const onUpdate = vi.fn();
		const onSnapshot = vi.fn();
		subscribe("s", { onUpdate, onSnapshot }, { eventSourceFactory: h.factory });

		expect(() => h.last.emit("ping", "")).not.toThrow();
		expect(onUpdate).not.toHaveBeenCalled();
		expect(onSnapshot).not.toHaveBeenCalled();
	});

	it("returned function closes the EventSource", () => {
		const h = makeHarness();
		const unsub = subscribe("s", {} as SnipStreamHandlers, {
			eventSourceFactory: h.factory,
		});
		expect(h.last.closed).toBe(false);
		unsub();
		expect(h.last.closed).toBe(true);
	});

	it("encodes the slug in the URL", () => {
		const h = makeHarness();
		subscribe("a-b-c", {} as SnipStreamHandlers, {
			eventSourceFactory: h.factory,
		});
		expect(h.url).toBe("/api/snips/a-b-c/events");
	});
});
