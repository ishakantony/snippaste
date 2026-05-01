import { describe, expect, it } from "vitest";
import { SnipBus, type SnipUpdate } from "../src/server/snipBus.js";

describe("SnipBus", () => {
	it("publish notifies subscribers for the matching slug", () => {
		const bus = new SnipBus();
		const received: SnipUpdate[] = [];
		bus.subscribe("slug-a", (e) => received.push(e));

		bus.publish("slug-a", { content: "hi", updatedAt: 1, clientId: "X" });

		expect(received).toHaveLength(1);
		expect(received[0]).toEqual({ content: "hi", updatedAt: 1, clientId: "X" });
	});

	it("publish does not notify subscribers of a different slug", () => {
		const bus = new SnipBus();
		const received: SnipUpdate[] = [];
		bus.subscribe("slug-a", (e) => received.push(e));

		bus.publish("slug-b", { content: "hi", updatedAt: 1 });

		expect(received).toHaveLength(0);
	});

	it("multiple subscribers on the same slug all receive each publish", () => {
		const bus = new SnipBus();
		const a: SnipUpdate[] = [];
		const b: SnipUpdate[] = [];
		bus.subscribe("s", (e) => a.push(e));
		bus.subscribe("s", (e) => b.push(e));

		bus.publish("s", { content: "1", updatedAt: 1 });
		bus.publish("s", { content: "2", updatedAt: 2 });

		expect(a.map((u) => u.content)).toEqual(["1", "2"]);
		expect(b.map((u) => u.content)).toEqual(["1", "2"]);
	});

	it("unsubscribe stops further notifications without affecting others", () => {
		const bus = new SnipBus();
		const a: SnipUpdate[] = [];
		const b: SnipUpdate[] = [];
		const unsubA = bus.subscribe("s", (e) => a.push(e));
		bus.subscribe("s", (e) => b.push(e));

		bus.publish("s", { content: "1", updatedAt: 1 });
		unsubA();
		bus.publish("s", { content: "2", updatedAt: 2 });

		expect(a).toHaveLength(1);
		expect(b).toHaveLength(2);
	});

	it("publish with no subscribers is a no-op (no throw)", () => {
		const bus = new SnipBus();
		expect(() =>
			bus.publish("nobody", { content: "x", updatedAt: 1 }),
		).not.toThrow();
	});

	it("clientId is optional on publish", () => {
		const bus = new SnipBus();
		const received: SnipUpdate[] = [];
		bus.subscribe("s", (e) => received.push(e));
		bus.publish("s", { content: "x", updatedAt: 1 });
		expect(received[0].clientId).toBeUndefined();
	});
});
