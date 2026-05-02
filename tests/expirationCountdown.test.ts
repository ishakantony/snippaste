import { describe, expect, it } from "vitest";
import { getExpirationInfo } from "@/client/lib/expirationCountdown.js";

describe("getExpirationInfo", () => {
	it("returns green with 29d left when updated 1 day ago", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 24 * 60 * 60 * 1000; // 1 day ago
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(29);
		expect(info.isExpired).toBe(false);
		expect(info.color).toBe("green");
	});

	it("returns yellow with 5d left when updated 25 days ago", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 25 * 24 * 60 * 60 * 1000; // 25 days ago
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(5);
		expect(info.isExpired).toBe(false);
		expect(info.color).toBe("yellow");
	});

	it("returns red with 2d left when updated 28 days ago", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 28 * 24 * 60 * 60 * 1000; // 28 days ago
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(2);
		expect(info.isExpired).toBe(false);
		expect(info.color).toBe("red");
	});

	it("returns red with 0d left when updated exactly 30 days ago", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 30 * 24 * 60 * 60 * 1000;
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(0);
		expect(info.isExpired).toBe(true);
		expect(info.color).toBe("red");
	});

	it("returns red expired when updated 31 days ago", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 31 * 24 * 60 * 60 * 1000;
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(-1);
		expect(info.isExpired).toBe(true);
		expect(info.color).toBe("red");
	});

	it("boundary: returns yellow at exactly 7 days", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 23 * 24 * 60 * 60 * 1000;
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(7);
		expect(info.color).toBe("yellow");
	});

	it("boundary: returns red at exactly 3 days", () => {
		const now = 1_700_000_000_000;
		const updatedAt = now - 27 * 24 * 60 * 60 * 1000;
		const info = getExpirationInfo(updatedAt, now);
		expect(info.daysRemaining).toBe(3);
		expect(info.color).toBe("red");
	});
});
