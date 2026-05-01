import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { SlugValidator } from "./slugValidator.js";
import { SnipBus, type SnipUpdate } from "./snipBus.js";
import type { SnipStore } from "./store.js";

const CLIENT_ID_MAX_LEN = 64;
const SSE_HEARTBEAT_MS = 25_000;

export interface BuildAppOptions {
	/** HTML shell served as the SPA fallback for non-/api GETs that don't match a static file. */
	spaShell?: string;
	/** Static asset middleware (e.g. serveStatic). Registered before the SPA catch-all so real files win. */
	staticMiddleware?: MiddlewareHandler;
	/** Pub/sub bus for real-time SSE updates. If omitted, a fresh in-process bus is created. */
	bus?: SnipBus;
}

export function buildApp(store: SnipStore, options: BuildAppOptions = {}) {
	const app = new Hono();
	const bus = options.bus ?? new SnipBus();

	app.get("/api/health", (c) => {
		return c.text("OK", 200);
	});

	app.get("/api/snips/:slug/events", (c) => {
		const result = SlugValidator.validate(c.req.param("slug"));
		if (!result.ok) {
			return c.json({ error: result.reason }, 400);
		}
		const slug = result.slug;

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
	});

	app.get("/api/snips/:slug", (c) => {
		const result = SlugValidator.validate(c.req.param("slug"));
		if (!result.ok) {
			return c.json({ error: result.reason }, 400);
		}

		const snip = store.get(result.slug);

		if (!snip) {
			return c.json({ error: "not_found" }, 404);
		}

		return c.json(snip, 200);
	});

	app.put("/api/snips/:slug", async (c) => {
		const result = SlugValidator.validate(c.req.param("slug"));
		if (!result.ok) {
			return c.json({ error: result.reason }, 400);
		}

		const body = await c.req.json<{ content: string; clientId?: unknown }>();

		if (Buffer.byteLength(body.content, "utf8") > 1_048_576) {
			return c.json(
				{ error: "content_too_large", message: "Content exceeds 1 MB limit" },
				413,
			);
		}

		let clientId: string | undefined;
		if (
			typeof body.clientId === "string" &&
			body.clientId.length > 0 &&
			body.clientId.length <= CLIENT_ID_MAX_LEN
		) {
			clientId = body.clientId;
		}

		store.upsert(result.slug, body.content);
		const snip = store.get(result.slug);
		bus.publish(result.slug, {
			content: body.content,
			updatedAt: snip?.updatedAt ?? Date.now(),
			clientId,
		});

		return c.body(null, 204);
	});

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
