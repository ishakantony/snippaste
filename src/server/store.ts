import { eq, lt, sql } from "drizzle-orm";
import { type AppDb, type DatabaseHandle, openDatabase } from "./db/index.js";
import { snips } from "./db/schema.js";
import { env } from "./env.js";

export interface SnipDTO {
	slug: string;
	content: string;
	updatedAt: number;
	protected: boolean;
	passwordUpdatedAt: number | null;
}

export class SnipStore {
	private handle: DatabaseHandle;
	private db: AppDb;

	constructor(dbPath: string = env.DB_PATH) {
		this.handle = openDatabase(dbPath);
		this.db = this.handle.db;
	}

	get(slug: string): SnipDTO | null {
		const row = this.db.select().from(snips).where(eq(snips.slug, slug)).get();

		if (!row) return null;

		return {
			slug: row.slug,
			content: row.content,
			updatedAt: row.updatedAt,
			protected: row.passwordHash !== null,
			passwordUpdatedAt: row.passwordUpdatedAt,
		};
	}

	upsert(slug: string, content: string, passwordHash?: string): void {
		const now = Date.now();
		if (passwordHash !== undefined) {
			this.db
				.insert(snips)
				.values({
					slug,
					content,
					createdAt: now,
					updatedAt: now,
					passwordHash,
					passwordUpdatedAt: now,
				})
				.onConflictDoUpdate({
					target: snips.slug,
					set: {
						content: sql`excluded.content`,
						updatedAt: sql`excluded.updated_at`,
						passwordHash: sql`COALESCE(${snips.passwordHash}, excluded.password_hash)`,
						passwordUpdatedAt: sql`COALESCE(${snips.passwordUpdatedAt}, excluded.password_updated_at)`,
					},
				})
				.run();
			return;
		}

		this.db
			.insert(snips)
			.values({ slug, content, createdAt: now, updatedAt: now })
			.onConflictDoUpdate({
				target: snips.slug,
				set: {
					content: sql`excluded.content`,
					updatedAt: sql`excluded.updated_at`,
				},
			})
			.run();
	}

	getPasswordHash(slug: string): string | null {
		const row = this.db
			.select({ passwordHash: snips.passwordHash })
			.from(snips)
			.where(eq(snips.slug, slug))
			.get();
		return row?.passwordHash ?? null;
	}

	setPassword(slug: string, passwordHash: string): void {
		this.db
			.update(snips)
			.set({ passwordHash, passwordUpdatedAt: Date.now() })
			.where(eq(snips.slug, slug))
			.run();
	}

	removePassword(slug: string): void {
		this.db
			.update(snips)
			.set({ passwordHash: null, passwordUpdatedAt: null })
			.where(eq(snips.slug, slug))
			.run();
	}

	clearContent(slug: string): void {
		const now = Date.now();
		this.db
			.update(snips)
			.set({ content: "", updatedAt: now })
			.where(eq(snips.slug, slug))
			.run();
	}

	deleteStale(maxAgeDays: number): number {
		const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
		const result = this.db
			.delete(snips)
			.where(lt(snips.updatedAt, cutoff))
			.run() as unknown as { changes: number };
		return result.changes;
	}

	close(): void {
		this.handle.close();
	}
}
