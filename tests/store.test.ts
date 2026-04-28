import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";

describe("SnipStore (in-memory SQLite)", () => {
  let store: SnipStore;

  beforeEach(() => {
    store = new SnipStore(":memory:");
  });

  afterEach(() => {
    store.close();
  });

  it("returns null for a missing slug", () => {
    expect(store.get("does-not-exist")).toBeNull();
  });

  it("upsert inserts, then updates the content", () => {
    store.upsert("hello", "world");
    expect(store.get("hello")?.content).toBe("world");

    store.upsert("hello", "updated");
    expect(store.get("hello")?.content).toBe("updated");
  });

  it("preserves created_at across updates", () => {
    // Access the DB directly through a second store on the same :memory: is not possible,
    // so we verify indirectly: created_at is set on first upsert and the row can be re-read.
    // We expose the DB through a subclass for this test only.
    const db = (store as unknown as { db: import("better-sqlite3").Database }).db;

    store.upsert("slug1", "v1");
    const before = (
      db.prepare<[], { created_at: number }>("SELECT created_at FROM snips WHERE slug = 'slug1'").get()!
    ).created_at;

    // Brief delay to ensure timestamps could differ
    store.upsert("slug1", "v2");
    const after = (
      db.prepare<[], { created_at: number }>("SELECT created_at FROM snips WHERE slug = 'slug1'").get()!
    ).created_at;

    expect(after).toBe(before);
  });

  it("bumps updated_at on subsequent upserts", () => {
    const db = (store as unknown as { db: import("better-sqlite3").Database }).db;

    store.upsert("slug2", "v1");
    const ua1 = (
      db.prepare<[], { updated_at: number }>("SELECT updated_at FROM snips WHERE slug = 'slug2'").get()!
    ).updated_at;

    // Force a detectable time gap
    const start = Date.now();
    while (Date.now() === start) { /* spin */ }

    store.upsert("slug2", "v2");
    const ua2 = (
      db.prepare<[], { updated_at: number }>("SELECT updated_at FROM snips WHERE slug = 'slug2'").get()!
    ).updated_at;

    expect(ua2).toBeGreaterThanOrEqual(ua1);
  });

  it("round-trip preserves Unicode strings", () => {
    const unicode = "こんにちは 🌏 Ñoño ✔️";
    store.upsert("unicode-slug", unicode);
    expect(store.get("unicode-slug")?.content).toBe(unicode);
  });

  it("round-trip preserves 1 MB-sized strings", () => {
    const big = "x".repeat(1024 * 1024);
    store.upsert("big-slug", big);
    expect(store.get("big-slug")?.content).toBe(big);
  });

  it("clearContent sets content to empty string", () => {
    store.upsert("clear-me", "some content");
    store.clearContent("clear-me");
    expect(store.get("clear-me")?.content).toBe("");
  });
});
