import { describe, expect, it, vi } from "vitest";
import { createClientId } from "@/client/clientId.js";

describe("clientId", () => {
	it("returns a non-empty string", () => {
		const id = createClientId();
		expect(typeof id).toBe("string");
		expect(id.length).toBeGreaterThan(0);
	});

	it("returns distinct ids on repeated calls (each tab is its own)", () => {
		const a = createClientId();
		const b = createClientId();
		expect(a).not.toBe(b);
	});

	it("uses the injected random source when provided", () => {
		const random = vi.fn((size: number) => new Uint8Array(size).map(() => 7));
		const id = createClientId(random);
		expect(random).toHaveBeenCalled();
		expect(id.length).toBeGreaterThan(0);
	});
});
