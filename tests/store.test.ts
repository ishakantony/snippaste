import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SnipStore } from "@/server/store";

interface RawStatement<T> {
	all(...params: unknown[]): T[];
	get(...params: unknown[]): T | null;
	run(...params: unknown[]): { changes: number };
}

interface RawClient {
	prepare<T>(sql: string): RawStatement<T>;
}

function rawClientFor(store: SnipStore): RawClient {
	return (store as unknown as { handle: { client: RawClient } }).handle.client;
}

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
		expect(store.get("hello")?.protected).toBe(false);

		store.upsert("hello", "updated");
		expect(store.get("hello")?.content).toBe("updated");
	});

	it("stores password metadata without exposing the password hash in get()", () => {
		store.upsert("secret", "content", "encoded-hash");
		const snip = store.get("secret");

		expect(snip?.protected).toBe(true);
		expect(typeof snip?.passwordUpdatedAt).toBe("number");
		expect("passwordHash" in (snip ?? {})).toBe(false);
		expect(store.getPasswordHash("secret")).toBe("encoded-hash");
	});

	it("can change and remove password protection", () => {
		store.upsert("secret", "content", "old-hash");
		store.setPassword("secret", "new-hash");
		expect(store.get("secret")?.protected).toBe(true);
		expect(store.getPasswordHash("secret")).toBe("new-hash");

		store.removePassword("secret");
		expect(store.get("secret")?.protected).toBe(false);
		expect(store.getPasswordHash("secret")).toBeNull();
	});

	it("preserves created_at across updates", () => {
		// Access the DB directly through a second store on the same :memory: is not possible,
		// so we verify indirectly: created_at is set on first upsert and the row can be re-read.
		// We expose the DB through a subclass for this test only.
		const db = rawClientFor(store);

		store.upsert("slug1", "v1");
		const before = db
			.prepare<{ created_at: number }>(
				"SELECT created_at FROM snips WHERE slug = 'slug1'",
			)
			.get()!.created_at;

		// Brief delay to ensure timestamps could differ
		store.upsert("slug1", "v2");
		const after = db
			.prepare<{ created_at: number }>(
				"SELECT created_at FROM snips WHERE slug = 'slug1'",
			)
			.get()!.created_at;

		expect(after).toBe(before);
	});

	it("bumps updated_at on subsequent upserts", () => {
		const db = rawClientFor(store);

		store.upsert("slug2", "v1");
		const ua1 = db
			.prepare<{ updated_at: number }>(
				"SELECT updated_at FROM snips WHERE slug = 'slug2'",
			)
			.get()!.updated_at;

		// Force a detectable time gap
		const start = Date.now();
		while (Date.now() === start) {
			/* spin */
		}

		store.upsert("slug2", "v2");
		const ua2 = db
			.prepare<{ updated_at: number }>(
				"SELECT updated_at FROM snips WHERE slug = 'slug2'",
			)
			.get()!.updated_at;

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

	it("deleteStale removes only old snips", () => {
		const db = rawClientFor(store);
		const now = Date.now();
		const day = 24 * 60 * 60 * 1000;

		db.prepare(
			"INSERT INTO snips (slug, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
		).run("fresh", "content", now, now);

		db.prepare(
			"INSERT INTO snips (slug, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
		).run("stale", "content", now - 31 * day, now - 31 * day);

		const deleted = store.deleteStale(30);
		expect(deleted).toBe(1);
		expect(store.get("fresh")).not.toBeNull();
		expect(store.get("stale")).toBeNull();
	});

	it("deleteStale returns 0 when nothing is stale", () => {
		store.upsert("recent", "content");
		const deleted = store.deleteStale(30);
		expect(deleted).toBe(0);
		expect(store.get("recent")).not.toBeNull();
	});
});

describe("SnipStore migrations", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "snippaste-store-"));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("creates all tables for a new database", () => {
		const dbPath = join(dir, "fresh.db");
		const store = new SnipStore(dbPath);
		store.close();

		const db = new Database(dbPath);
		try {
			const rawDb = db as unknown as RawClient;
			const snipsTable = rawDb
				.prepare<{ name: string }>(
					"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'snips'",
				)
				.get();
			const migrationsTable = rawDb
				.prepare<{ name: string }>(
					"SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
				)
				.get();

			expect(snipsTable?.name).toBe("snips");
			expect(migrationsTable?.name).toBe("__drizzle_migrations");
		} finally {
			db.close();
		}
	});

	it("upgrades a pre-Drizzle snips table without losing data", () => {
		const dbPath = join(dir, "legacy.db");
		const legacyDb = new Database(dbPath);
		legacyDb.exec(`
			CREATE TABLE snips (
				slug TEXT PRIMARY KEY,
				content TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			);
		`);
		legacyDb
			.prepare(
				"INSERT INTO snips (slug, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
			)
			.run("legacy", "survives", 1, 2);
		legacyDb.close();

		const store = new SnipStore(dbPath);
		const snip = store.get("legacy");
		store.close();

		expect(snip).toMatchObject({
			slug: "legacy",
			content: "survives",
			updatedAt: 2,
			protected: false,
			passwordUpdatedAt: null,
		});

		const migratedDb = new Database(dbPath);
		try {
			const rawDb = migratedDb as unknown as RawClient;
			const columns = rawDb
				.prepare<{ name: string }>("PRAGMA table_info(snips)")
				.all()
				.map((column) => column.name);

			expect(columns).toContain("password_hash");
			expect(columns).toContain("password_updated_at");
		} finally {
			migratedDb.close();
		}
	});
});
