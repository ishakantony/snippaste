import { Database } from "bun:sqlite";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { env } from "../env";
import * as schema from "./schema";

export type AppDb = BunSQLiteDatabase<typeof schema>;

export interface DatabaseHandle {
	client: Database;
	db: AppDb;
	close(): void;
}

export interface OpenDatabaseOptions {
	runMigrations?: boolean;
	migrationsFolder?: string;
}

export function openDatabase(
	dbPath: string = env.DB_PATH,
	options: OpenDatabaseOptions = {},
): DatabaseHandle {
	const client = new Database(dbPath);
	client.run("PRAGMA journal_mode = WAL");

	const db = drizzle(client, { schema });

	if (options.runMigrations !== false) {
		bootstrapLegacySchema(client);
		migrate(db, { migrationsFolder: options.migrationsFolder ?? "./drizzle" });
	}

	return {
		client,
		db,
		close: () => client.close(),
	};
}

function bootstrapLegacySchema(client: Database): void {
	const existingTable = client
		.query<{ name: string }, [string]>(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
		)
		.get("snips");

	if (!existingTable) return;

	const columns = client
		.query<{ name: string }, []>("PRAGMA table_info(snips)")
		.all()
		.map((column) => column.name);

	if (!columns.includes("password_hash")) {
		client.run("ALTER TABLE snips ADD COLUMN password_hash TEXT");
	}

	if (!columns.includes("password_updated_at")) {
		client.run("ALTER TABLE snips ADD COLUMN password_updated_at INTEGER");
	}
}
