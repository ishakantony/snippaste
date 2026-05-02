import { describe, expect, it } from "vitest";
import { SlugGenerator } from "@/client/slugGenerator.js";

const URL_SAFE_ALPHABET = new Set("abcdefghijklmnopqrstuvwxyz0123456789");

describe("SlugGenerator.generate", () => {
	it("returns a string of exactly 8 characters", () => {
		const slug = SlugGenerator.generate();
		expect(slug).toHaveLength(8);
	});

	it("returns only URL-safe alphabet characters (lowercase letters and digits)", () => {
		// Run several times to cover randomness
		for (let i = 0; i < 20; i++) {
			const slug = SlugGenerator.generate();
			for (const char of slug) {
				expect(URL_SAFE_ALPHABET.has(char)).toBe(true);
			}
		}
	});

	it("produces an 8-character deterministic output with an injectable random source", () => {
		// Build a deterministic Uint8Array source that always returns bytes [0, 1, 2, 3, 4, 5, 6, 7]
		let callCount = 0;
		const deterministicRandom = (size: number): Uint8Array => {
			callCount++;
			const arr = new Uint8Array(size);
			for (let i = 0; i < size; i++) {
				arr[i] = i % 36; // fits within 36-char alphabet cleanly
			}
			return arr;
		};

		const slug = SlugGenerator.generate(deterministicRandom);
		expect(slug).toHaveLength(8);
		expect(callCount).toBeGreaterThan(0);
		// Should be deterministic — same source gives same output
		const slug2 = SlugGenerator.generate(deterministicRandom);
		expect(slug).toBe(slug2);
	});

	it("generates unique slugs across multiple calls (probabilistic)", () => {
		const slugs = new Set<string>();
		for (let i = 0; i < 100; i++) {
			slugs.add(SlugGenerator.generate());
		}
		// With 36^8 ≈ 2.8 trillion possibilities, 100 calls should all be unique
		expect(slugs.size).toBe(100);
	});
});
