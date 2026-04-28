import { describe, it, expect } from "vitest";
import { SlugValidator } from "../src/server/slugValidator.js";

describe("SlugValidator.validate", () => {
  // --- valid slugs (post-normalization) ---
  const validCases: Array<{ input: string; expectedSlug: string; label: string }> = [
    { input: "a",               expectedSlug: "a",               label: "length 1 (min)" },
    { input: "hello-world",     expectedSlug: "hello-world",     label: "mid-range with hyphen" },
    { input: "abc123",          expectedSlug: "abc123",          label: "alphanumeric mid-range" },
    { input: "a".repeat(64),    expectedSlug: "a".repeat(64),    label: "length 64 (max)" },
    { input: "  hello  ",       expectedSlug: "hello",           label: "whitespace trimmed to valid slug" },
    { input: "UPPER-CASE",      expectedSlug: "upper-case",      label: "uppercase input normalized to lowercase" },
  ];

  for (const { input, expectedSlug, label } of validCases) {
    it(`accepts: ${label}`, () => {
      const result = SlugValidator.validate(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.slug).toBe(expectedSlug);
      }
    });
  }

  // --- invalid slugs (after normalization still invalid) ---
  const invalidCases: Array<{ input: string; label: string }> = [
    { input: "",                label: "length 0 (empty string)" },
    { input: "   ",             label: "length 0 after trim (whitespace only)" },
    { input: "a".repeat(65),    label: "length 65 (over max)" },
    { input: "has space",       label: "contains space" },
    { input: "with/slash",      label: "contains slash" },
    { input: "with.dot",        label: "contains dot" },
    { input: "emoji-\u{1F600}", label: "contains emoji" },
    { input: "under_score",     label: "contains underscore" },
  ];

  for (const { input, label } of invalidCases) {
    it(`rejects: ${label}`, () => {
      const result = SlugValidator.validate(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(typeof result.reason).toBe("string");
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });
  }
});
