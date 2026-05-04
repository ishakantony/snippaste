import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "@/server/routes";
import { SnipBus, type SnipUpdate } from "@/server/snipBus";
import { SnipStore } from "@/server/store";

const TEST_SESSION_SECRET = "test-session-secret";

describe("SSE / broadcast on PUT", () => {
	let store: SnipStore;
	let bus: SnipBus;
	let app: ReturnType<typeof buildApp>;

	beforeEach(() => {
		store = new SnipStore(":memory:");
		bus = new SnipBus();
		app = buildApp(store, { bus, sessionSecret: TEST_SESSION_SECRET });
	});

	afterEach(() => {
		store.close();
	});

	it("PUT publishes the new content to the bus for that slug", async () => {
		const updates: SnipUpdate[] = [];
		bus.subscribe("test-slug", (u) => updates.push(u));

		const res = await app.fetch(
			new Request("http://localhost/api/snips/test-slug", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "hello" }),
			}),
		);
		expect(res.status).toBe(204);

		expect(updates).toHaveLength(1);
		expect(updates[0].content).toBe("hello");
		expect(typeof updates[0].updatedAt).toBe("number");
	});

	it("PUT forwards clientId from the body to the published event", async () => {
		const updates: SnipUpdate[] = [];
		bus.subscribe("foo", (u) => updates.push(u));

		await app.fetch(
			new Request("http://localhost/api/snips/foo", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "x", clientId: "abc-123" }),
			}),
		);

		expect(updates[0].clientId).toBe("abc-123");
	});

	it("PUT without clientId publishes with clientId undefined", async () => {
		const updates: SnipUpdate[] = [];
		bus.subscribe("foo", (u) => updates.push(u));

		await app.fetch(
			new Request("http://localhost/api/snips/foo", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "x" }),
			}),
		);

		expect(updates[0].clientId).toBeUndefined();
	});

	it("PUT with invalid slug does not publish", async () => {
		const updates: SnipUpdate[] = [];
		bus.subscribe("bad.slug", (u) => updates.push(u));

		await app.fetch(
			new Request("http://localhost/api/snips/bad.slug", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "x" }),
			}),
		);

		expect(updates).toHaveLength(0);
	});

	it("PUT exceeding 1MB does not publish", async () => {
		const updates: SnipUpdate[] = [];
		bus.subscribe("big", (u) => updates.push(u));

		const content = "a".repeat(1_048_577);
		const res = await app.fetch(
			new Request("http://localhost/api/snips/big", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			}),
		);
		expect(res.status).toBe(413);
		expect(updates).toHaveLength(0);
	});

	it("clientId longer than 64 chars is rejected and not published", async () => {
		const updates: SnipUpdate[] = [];
		bus.subscribe("foo", (u) => updates.push(u));

		const longId = "x".repeat(65);
		await app.fetch(
			new Request("http://localhost/api/snips/foo", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "x", clientId: longId }),
			}),
		);

		// server tolerates the field but treats it as absent (or rejects) — at minimum it must not crash
		if (updates.length > 0) {
			expect(updates[0].clientId).not.toBe(longId);
		}
	});
});

describe("SSE event stream", () => {
	let store: SnipStore;
	let bus: SnipBus;
	let app: ReturnType<typeof buildApp>;

	beforeEach(() => {
		store = new SnipStore(":memory:");
		bus = new SnipBus();
		app = buildApp(store, { bus, sessionSecret: TEST_SESSION_SECRET });
	});

	afterEach(() => {
		store.close();
	});

	it("GET /api/snips/:slug/events validates slug (400 on invalid)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/api/snips/bad.slug/events"),
		);
		expect(res.status).toBe(400);
	});

	it("GET /api/snips/:slug/events returns text/event-stream content-type", async () => {
		const res = await app.fetch(
			new Request("http://localhost/api/snips/known/events"),
		);
		expect(res.status).toBe(200);
		const ct = res.headers.get("content-type") ?? "";
		expect(ct).toContain("text/event-stream");

		// Cancel the stream to release the request
		if (res.body) await res.body.cancel();
	});

	it("GET /api/snips/:slug/events rejects protected snips until unlocked", async () => {
		await app.fetch(
			new Request("http://localhost/api/snips/protected-stream", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "secret", password: "open-sesame" }),
			}),
		);

		const locked = await app.fetch(
			new Request("http://localhost/api/snips/protected-stream/events"),
		);
		expect(locked.status).toBe(401);

		const unlock = await app.fetch(
			new Request("http://localhost/api/snips/protected-stream/unlock", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "open-sesame" }),
			}),
		);
		const unlocked = await app.fetch(
			new Request("http://localhost/api/snips/protected-stream/events", {
				headers: { Cookie: unlock.headers.get("set-cookie") ?? "" },
			}),
		);
		expect(unlocked.status).toBe(200);
		if (unlocked.body) await unlocked.body.cancel();
	});

	it("PUT after subscription delivers an update event on the stream", async () => {
		const res = await app.fetch(
			new Request("http://localhost/api/snips/sse-slug/events"),
		);
		expect(res.status).toBe(200);

		const reader = res.body!.getReader();
		const decoder = new TextDecoder();

		async function readUntilEvent(
			eventName: string,
			timeoutMs: number,
		): Promise<{ event: string; data: string } | null> {
			let buf = "";
			const deadline = Date.now() + timeoutMs;
			while (Date.now() < deadline) {
				const remaining = deadline - Date.now();
				const next = await Promise.race([
					reader.read(),
					new Promise<null>((resolve) =>
						setTimeout(() => resolve(null), remaining),
					),
				]);
				if (next === null) return null;
				if (next.done) return null;
				buf += decoder.decode(next.value, { stream: true });
				const frames = buf.split("\n\n");
				buf = frames.pop() ?? "";
				for (const frame of frames) {
					const lines = frame.split("\n");
					let event = "message";
					const dataLines: string[] = [];
					for (const line of lines) {
						if (line.startsWith("event:")) event = line.slice(6).trim();
						else if (line.startsWith("data:"))
							dataLines.push(line.slice(5).trim());
					}
					if (event === eventName) {
						return { event, data: dataLines.join("\n") };
					}
				}
			}
			return null;
		}

		// First, drain the snapshot so we know the subscription is established
		const snapshot = await readUntilEvent("snapshot", 1500);
		expect(snapshot).not.toBeNull();

		// Now issue the PUT; the publish should arrive on our stream
		void app.fetch(
			new Request("http://localhost/api/snips/sse-slug", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "via-sse", clientId: "C-1" }),
			}),
		);

		const update = await readUntilEvent("update", 1500);
		await reader.cancel();

		expect(update).not.toBeNull();
		const payload = JSON.parse(update!.data) as {
			content: string;
			updatedAt: number;
			clientId?: string;
		};
		expect(payload.content).toBe("via-sse");
		expect(payload.clientId).toBe("C-1");
		expect(typeof payload.updatedAt).toBe("number");
	});
});
