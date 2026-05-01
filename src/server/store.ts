import Database from "better-sqlite3";

export interface SnipDTO {
  slug: string;
  content: string;
  updatedAt: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS snips (
  slug       TEXT    PRIMARY KEY,
  content    TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)
`;

export class SnipStore {
  private db: Database.Database;

  constructor(dbPath: string = process.env.DB_PATH ?? "/data/snippaste.db") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);
  }

  get(slug: string): SnipDTO | null {
    const row = this.db
      .prepare<[string], { slug: string; content: string; updated_at: number }>(
        "SELECT slug, content, updated_at FROM snips WHERE slug = ?"
      )
      .get(slug);

    if (!row) return null;

    return { slug: row.slug, content: row.content, updatedAt: row.updated_at };
  }

  upsert(slug: string, content: string): void {
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO snips (slug, content, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           content    = excluded.content,
           updated_at = excluded.updated_at`
      )
      .run(slug, content, now, now);
  }

  clearContent(slug: string): void {
    const now = Date.now();
    this.db
      .prepare(
        `UPDATE snips SET content = '', updated_at = ? WHERE slug = ?`
      )
      .run(now, slug);
  }

  deleteStale(maxAgeDays: number): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const result = this.db
      .prepare("DELETE FROM snips WHERE updated_at < ?")
      .run(cutoff);
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}
