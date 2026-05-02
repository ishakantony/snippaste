import { zValidator } from "@hono/zod-validator";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { slugSchema, snipPutBodySchema } from "../shared/schemas.js";
import { SnipBus, type SnipUpdate } from "./snipBus.js";
import type { SnipStore } from "./store.js";

const MAX_CONTENT_BYTES = 1_048_576;
const SSE_HEARTBEAT_MS = 25_000;

const slugParamSchema = z.object({ slug: slugSchema });
const bodySchema = snipPutBodySchema;

// biome-ignore lint/suspicious/noExplicitAny: zValidator hook types are complex
function slugErrorHook(result: any, c: any) {
	if (!result.success) {
		const message = result.error.issues[0]?.message ?? "invalid_slug";
		return c.json({ error: message }, 400);
	}
}

// biome-ignore lint/suspicious/noExplicitAny: zValidator hook types are complex
function bodyErrorHook(result: any, c: any) {
	if (!result.success) {
		return c.json(
			{ error: "invalid_body", message: "Request body is invalid" },
			400,
		);
	}
}

export interface BuildAppOptions {
	spaShell?: string;
	staticMiddleware?: MiddlewareHandler;
	bus?: SnipBus;
}

export function buildApp(store: SnipStore, options: BuildAppOptions = {}) {
	const app = new Hono();
	const bus = options.bus ?? new SnipBus();

	app.get("/api/health", (c) => {
		return c.text("OK", 200);
	});

	app.get(
		"/api/snips/:slug/events",
		zValidator("param", slugParamSchema, slugErrorHook),
		(c) => {
			const { slug } = c.req.valid("param");

			return streamSSE(c, async (stream) => {
				const snapshot = store.get(slug);
				await stream.writeSSE({
					event: "snapshot",
					data: JSON.stringify({
						content: snapshot?.content ?? "",
						updatedAt: snapshot?.updatedAt ?? 0,
					}),
				});

				const queue: SnipUpdate[] = [];
				let resolveNext: (() => void) | null = null;
				const unsubscribe = bus.subscribe(slug, (update) => {
					queue.push(update);
					if (resolveNext) {
						const r = resolveNext;
						resolveNext = null;
						r();
					}
				});

				let aborted = false;
				stream.onAbort(() => {
					aborted = true;
					unsubscribe();
					if (resolveNext) {
						const r = resolveNext;
						resolveNext = null;
						r();
					}
				});

				const heartbeat = setInterval(() => {
					stream.writeSSE({ event: "ping", data: "" }).catch(() => {});
				}, SSE_HEARTBEAT_MS);

				try {
					while (!aborted) {
						while (queue.length > 0 && !aborted) {
							// biome-ignore lint/style/noNonNullAssertion: we just checked queue.length > 0
							const update = queue.shift()!;
							await stream.writeSSE({
								event: "update",
								data: JSON.stringify(update),
							});
						}
						if (aborted) break;
						await new Promise<void>((resolve) => {
							resolveNext = resolve;
						});
					}
				} finally {
					clearInterval(heartbeat);
					unsubscribe();
				}
			});
		},
	);

	app.get(
		"/api/snips/:slug",
		zValidator("param", slugParamSchema, slugErrorHook),
		(c) => {
			const { slug } = c.req.valid("param");

			const snip = store.get(slug);

			if (!snip) {
				return c.json({ error: "not_found" }, 404);
			}

			return c.json(snip, 200);
		},
	);

	app.put(
		"/api/snips/:slug",
		zValidator("param", slugParamSchema, slugErrorHook),
		zValidator("json", bodySchema, bodyErrorHook),
		async (c) => {
			const { slug } = c.req.valid("param");
			const body = c.req.valid("json");

			if (Buffer.byteLength(body.content, "utf8") > MAX_CONTENT_BYTES) {
				return c.json(
					{ error: "content_too_large", message: "Content exceeds 1 MB limit" },
					413,
				);
			}

			store.upsert(slug, body.content);
			const snip = store.get(slug);
			bus.publish(slug, {
				content: body.content,
				updatedAt: snip?.updatedAt ?? Date.now(),
				clientId: body.clientId,
			});

			return c.body(null, 204);
		},
	);

	if (options.staticMiddleware) {
		app.use("/*", options.staticMiddleware);
	}

	if (options.spaShell !== undefined) {
		const shell = options.spaShell;
		app.get("*", (c) => {
			const path = new URL(c.req.url).pathname;
			if (path.startsWith("/api/")) {
				return c.json({ error: "not_found" }, 404);
			}
			return c.html(shell);
		});
	}

	return app;
}
