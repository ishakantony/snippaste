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

	values(...params: unknown[]): unknown[][] {
		return this.stmt.raw().all(...params) as unknown[][];
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

	exec(sql: string): void {
		this.db.exec(sql);
	}

	query<T = unknown>(sql: string): Statement<T> {
		return new Statement<T>(this.db.prepare(sql));
	}

	prepare<T = unknown>(sql: string): Statement<T> {
		return this.query<T>(sql);
	}

	transaction<T>(fn: () => T): () => T {
		return this.db.transaction(fn) as () => T;
	}

	close(): void {
		this.db.close();
	}
}

export { Database };
