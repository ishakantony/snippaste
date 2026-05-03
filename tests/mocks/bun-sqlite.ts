import BetterSQLite from "better-sqlite3";

class Statement<T = unknown> {
	constructor(private stmt: BetterSQLite.Statement) {}

	get(...params: unknown[]): T | null {
		return (this.stmt.get(...params) as T) ?? null;
	}

	all(...params: unknown[]): T[] {
		return this.stmt.all(...params) as T[];
	}

	run(...params: unknown[]): {
		changes: number;
		lastInsertRowid: number | bigint;
	} {
		return this.stmt.run(...params);
	}
}

class Database {
	private db: BetterSQLite.Database;

	constructor(path: string) {
		this.db = new BetterSQLite(path);
	}

	run(sql: string, ...params: unknown[]): void {
		if (params.length === 0) {
			this.db.exec(sql);
		} else {
			this.db.prepare(sql).run(...params);
		}
	}

	query<T = unknown>(sql: string): Statement<T> {
		return new Statement<T>(this.db.prepare(sql));
	}

	prepare<T = unknown>(sql: string): Statement<T> {
		return this.query<T>(sql);
	}

	close(): void {
		this.db.close();
	}
}

export { Database };
