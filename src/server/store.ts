import { Database } from "bun:sqlite";
import { env } from "./env.js";

export interface SnipDTO {
	slug: string;
	content: string;
	updatedAt: number;
	protected: boolean;
	passwordUpdatedAt: number | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS snips (
  slug       TEXT    PRIMARY KEY,
  content    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  password_hash TEXT,
  password_updated_at INTEGER
)
`;

export class SnipStore {
	private db: Database;

	constructor(dbPath: string = env.DB_PATH) {
		this.db = new Database(dbPath);
		this.db.run("PRAGMA journal_mode = WAL");
		this.db.run(SCHEMA);
		this.migrate();
	}

	private migrate(): void {
		const columns = this.db
			.query<{ name: string }, []>("PRAGMA table_info(snips)")
			.all()
			.map((column) => column.name);
		if (!columns.includes("password_hash")) {
			this.db.run("ALTER TABLE snips ADD COLUMN password_hash TEXT");
		}
		if (!columns.includes("password_updated_at")) {
			this.db.run("ALTER TABLE snips ADD COLUMN password_updated_at INTEGER");
		}
	}

	get(slug: string): SnipDTO | null {
		const row = this.db
			.query<
				{
					slug: string;
					content: string;
					updated_at: number;
					password_hash: string | null;
					password_updated_at: number | null;
				},
				[string]
			>(
				"SELECT slug, content, updated_at, password_hash, password_updated_at FROM snips WHERE slug = ?",
			)
			.get(slug);

		if (!row) return null;

		return {
			slug: row.slug,
			content: row.content,
			updatedAt: row.updated_at,
			protected: row.password_hash !== null,
			passwordUpdatedAt: row.password_updated_at,
		};
	}

	upsert(slug: string, content: string, passwordHash?: string): void {
		const now = Date.now();
		if (passwordHash !== undefined) {
			this.db
				.query(
					`INSERT INTO snips (slug, content, created_at, updated_at, password_hash, password_updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           content    = excluded.content,
           updated_at = excluded.updated_at,
           password_hash = COALESCE(snips.password_hash, excluded.password_hash),
           password_updated_at = COALESCE(snips.password_updated_at, excluded.password_updated_at)`,
				)
				.run(slug, content, now, now, passwordHash, now);
			return;
		}

		this.db
			.query(
				`INSERT INTO snips (slug, content, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           content    = excluded.content,
           updated_at = excluded.updated_at`,
			)
			.run(slug, content, now, now);
	}

	getPasswordHash(slug: string): string | null {
		const row = this.db
			.query<{ password_hash: string | null }, [string]>(
				"SELECT password_hash FROM snips WHERE slug = ?",
			)
			.get(slug);
		return row?.password_hash ?? null;
	}

	setPassword(slug: string, passwordHash: string): void {
		this.db
			.query(
				"UPDATE snips SET password_hash = ?, password_updated_at = ? WHERE slug = ?",
			)
			.run(passwordHash, Date.now(), slug);
	}

	removePassword(slug: string): void {
		this.db
			.query(
				"UPDATE snips SET password_hash = NULL, password_updated_at = NULL WHERE slug = ?",
			)
			.run(slug);
	}

	clearContent(slug: string): void {
		const now = Date.now();
		this.db
			.query(`UPDATE snips SET content = '', updated_at = ? WHERE slug = ?`)
			.run(now, slug);
	}

	deleteStale(maxAgeDays: number): number {
		const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
		const result = this.db
			.query("DELETE FROM snips WHERE updated_at < ?")
			.run(cutoff);
		return result.changes;
	}

	close(): void {
		this.db.close();
	}
}
