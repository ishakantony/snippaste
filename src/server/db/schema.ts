import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const snips = sqliteTable("snips", {
	slug: text("slug").primaryKey(),
	content: text("content").notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	passwordHash: text("password_hash"),
	passwordUpdatedAt: integer("password_updated_at"),
});

export type SnipRow = typeof snips.$inferSelect;
export type NewSnipRow = typeof snips.$inferInsert;
