import {
	createRoute,
	extendZodWithOpenApi,
	OpenAPIHono,
} from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import type { MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import {
	passwordBodySchema,
	slugSchema,
	snipPutBodySchema,
} from "../shared/schemas";
import {
	cookieNameForSlug,
	hashPassword,
	signUnlockCookie,
	verifyPassword,
	verifyUnlockCookie,
} from "./passwordAuth";
import { SnipBus, type SnipUpdate } from "./snipBus";
import type { SnipStore } from "./store";

extendZodWithOpenApi(z);

const MAX_CONTENT_BYTES = 1_048_576;
const SSE_HEARTBEAT_MS = 25_000;
const UNLOCK_WINDOW_MS = 10 * 60 * 1000;
const MAX_UNLOCK_FAILURES = 5;

const slugParamSchema = z.object({ slug: slugSchema });
const errorSchema = z.object({
	error: z.string(),
	message: z.string().optional(),
});
const snipResponseSchema = z.object({
	slug: z.string(),
	content: z.string(),
	updatedAt: z.number(),
	protected: z.boolean(),
	passwordUpdatedAt: z.number().nullable(),
});

// --- Route definitions ---

const healthRoute = createRoute({
	method: "get",
	path: "/api/health",
	tags: ["System"],
	summary: "Health check",
	responses: {
		200: {
			description: "OK",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

const getSnipEventsRoute = createRoute({
	method: "get",
	path: "/api/snips/{slug}/events",
	tags: ["Snips"],
	summary: "Subscribe to real-time snippet updates via SSE",
	request: { params: slugParamSchema },
	responses: {
		200: {
			description: "SSE stream — events: snapshot, update, ping",
			content: {
				"text/event-stream": {
					schema: z.string().describe("event: <type>\\ndata: <json>\\n\\n"),
				},
			},
		},
		401: {
			description: "Snippet is locked",
			content: { "application/json": { schema: errorSchema } },
		},
	},
});

const getSnipRoute = createRoute({
	method: "get",
	path: "/api/snips/{slug}",
	tags: ["Snips"],
	summary: "Fetch a snippet",
	request: { params: slugParamSchema },
	responses: {
		200: {
			description: "Snippet found",
			content: { "application/json": { schema: snipResponseSchema } },
		},
		401: {
			description: "Snippet is locked — valid unlock cookie required",
			content: { "application/json": { schema: errorSchema } },
		},
		404: {
			description: "Snippet does not exist",
			content: { "application/json": { schema: errorSchema } },
		},
	},
});

const putSnipRoute = createRoute({
	method: "put",
	path: "/api/snips/{slug}",
	tags: ["Snips"],
	summary: "Create or update a snippet",
	request: {
		params: slugParamSchema,
		body: {
			content: { "application/json": { schema: snipPutBodySchema } },
			required: true,
		},
	},
	responses: {
		204: { description: "Snippet saved" },
		400: {
			description: "Invalid request",
			content: { "application/json": { schema: errorSchema } },
		},
		401: {
			description: "Snippet is locked",
			content: { "application/json": { schema: errorSchema } },
		},
		413: {
			description: "Content exceeds 1 MB limit",
			content: { "application/json": { schema: errorSchema } },
		},
	},
});

const postUnlockRoute = createRoute({
	method: "post",
	path: "/api/snips/{slug}/unlock",
	tags: ["Auth"],
	summary: "Unlock a password-protected snippet",
	request: {
		params: slugParamSchema,
		body: {
			content: { "application/json": { schema: passwordBodySchema } },
			required: true,
		},
	},
	responses: {
		204: { description: "Unlocked — unlock cookie set" },
		401: {
			description: "Invalid password",
			content: { "application/json": { schema: errorSchema } },
		},
		404: {
			description: "Snippet does not exist",
			content: { "application/json": { schema: errorSchema } },
		},
		429: {
			description: "Rate limited",
			content: { "application/json": { schema: errorSchema } },
		},
	},
});

const postLockRoute = createRoute({
	method: "post",
	path: "/api/snips/{slug}/lock",
	tags: ["Auth"],
	summary: "Expire the current unlock session",
	request: { params: slugParamSchema },
	responses: {
		204: { description: "Session cookie expired" },
	},
});

const putPasswordRoute = createRoute({
	method: "put",
	path: "/api/snips/{slug}/password",
	tags: ["Auth"],
	summary: "Set or change the snippet password",
	request: {
		params: slugParamSchema,
		body: {
			content: { "application/json": { schema: passwordBodySchema } },
			required: true,
		},
	},
	responses: {
		204: { description: "Password set" },
		401: {
			description: "Not authorised — must be unlocked owner",
			content: { "application/json": { schema: errorSchema } },
		},
		404: {
			description: "Snippet not found or feature disabled",
			content: { "application/json": { schema: errorSchema } },
		},
	},
});

const deletePasswordRoute = createRoute({
	method: "delete",
	path: "/api/snips/{slug}/password",
	tags: ["Auth"],
	summary: "Remove the snippet password",
	request: { params: slugParamSchema },
	responses: {
		204: { description: "Password removed" },
		401: {
			description: "Not authorised",
			content: { "application/json": { schema: errorSchema } },
		},
		404: {
			description: "Snippet not found or feature disabled",
			content: { "application/json": { schema: errorSchema } },
		},
	},
});

// Phantom typed app — provides AppType for the RPC client without runtime handlers.
const _typeApp = new OpenAPIHono()
	.openapi(healthRoute, (() => {}) as never)
	.openapi(getSnipEventsRoute, (() => {}) as never)
	.openapi(getSnipRoute, (() => {}) as never)
	.openapi(putSnipRoute, (() => {}) as never)
	.openapi(postUnlockRoute, (() => {}) as never)
	.openapi(postLockRoute, (() => {}) as never)
	.openapi(putPasswordRoute, (() => {}) as never)
	.openapi(deletePasswordRoute, (() => {}) as never);

export type AppType = typeof _typeApp;

// --- Shared options ---

export interface BuildAppOptions {
	spaShell?: string;
	staticMiddleware?: MiddlewareHandler;
	bus?: SnipBus;
	passwordProtectionEnabled?: boolean;
	sessionSecret?: string;
}

// --- Helpers ---

function readCookie(cookies: string | null, name: string): string | null {
	if (!cookies) return null;
	for (const cookie of cookies.split(";")) {
		const [rawName, ...rawValue] = cookie.trim().split("=");
		if (rawName === name) return rawValue.join("=");
	}
	return null;
}

function hasUnlockCookie(
	cookies: string | null,
	slug: string,
	passwordUpdatedAt: number | null,
	secret: string | undefined,
): boolean {
	if (passwordUpdatedAt === null || !secret) return false;
	const value = readCookie(cookies, cookieNameForSlug(slug));
	if (!value) return false;
	return verifyUnlockCookie(value, secret) === `${slug}:${passwordUpdatedAt}`;
}

function expiredCookieHeader(slug: string): string {
	return `${cookieNameForSlug(slug)}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

interface UnlockFailureRecord {
	count: number;
	firstAttemptAt: number;
}

// --- App factory ---

export function buildApp(store: SnipStore, options: BuildAppOptions = {}) {
	const bus = options.bus ?? new SnipBus();
	const passwordProtectionEnabled = options.passwordProtectionEnabled ?? true;
	const sessionSecret = options.sessionSecret;

	function requireSessionSecret(): string {
		if (sessionSecret) return sessionSecret;
		throw new Error(
			"sessionSecret is required when password protection is enabled",
		);
	}
	if (passwordProtectionEnabled) requireSessionSecret();

	const unlockFailures = new Map<string, UnlockFailureRecord>();

	// biome-ignore lint/suspicious/noExplicitAny: Hono context type is route-specific here.
	function unlockFailureKey(c: any, slug: string): string {
		const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
		return `${slug}:${forwardedFor || "unknown"}`;
	}

	function isUnlockLimited(key: string): boolean {
		const record = unlockFailures.get(key);
		if (!record) return false;
		const now = Date.now();
		if (now - record.firstAttemptAt >= UNLOCK_WINDOW_MS) {
			unlockFailures.delete(key);
			return false;
		}
		return record.count >= MAX_UNLOCK_FAILURES;
	}

	function recordUnlockFailure(key: string): void {
		const now = Date.now();
		const record = unlockFailures.get(key);
		if (!record || now - record.firstAttemptAt >= UNLOCK_WINDOW_MS) {
			unlockFailures.set(key, { count: 1, firstAttemptAt: now });
			return;
		}
		record.count += 1;
	}

	const app = new OpenAPIHono({
		defaultHook: (result, c) => {
			if (!result.success) {
				if (result.target === "param") {
					const message = result.error.issues[0]?.message ?? "invalid_slug";
					return c.json({ error: message }, 400);
				}
				return c.json(
					{ error: "invalid_body", message: "Request body is invalid" },
					400,
				);
			}
		},
	});

	app.openapi(healthRoute, (c) => c.text("OK", 200));

	app.openapi(getSnipEventsRoute, (c) => {
		const { slug } = c.req.valid("param");
		const snip = store.get(slug);
		if (
			snip?.protected &&
			!hasUnlockCookie(
				c.req.header("cookie") ?? null,
				slug,
				snip.passwordUpdatedAt,
				sessionSecret,
			)
		) {
			return c.json({ error: "locked" }, 401) as never;
		}

		return streamSSE(c, async (stream) => {
			const snapshot = snip ?? store.get(slug);
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
		}) as never;
	});

	app.openapi(getSnipRoute, (c) => {
		const { slug } = c.req.valid("param");
		const snip = store.get(slug);

		if (!snip) return c.json({ error: "not_found" }, 404);

		if (
			snip.protected &&
			!hasUnlockCookie(
				c.req.header("cookie") ?? null,
				slug,
				snip.passwordUpdatedAt,
				sessionSecret,
			)
		) {
			return c.json({ error: "locked" }, 401);
		}

		return c.json(snip, 200);
	});

	app.openapi(postUnlockRoute, (c) => {
		const { slug } = c.req.valid("param");
		const { password } = c.req.valid("json");
		const failureKey = unlockFailureKey(c, slug);
		if (isUnlockLimited(failureKey)) {
			return c.json({ error: "rate_limited" }, 429);
		}
		const snip = store.get(slug);
		if (!snip) return c.json({ error: "not_found" }, 404);
		if (!snip.protected) return c.body(null, 204);

		const passwordHash = store.getPasswordHash(slug);
		if (!passwordHash || !verifyPassword(password, passwordHash)) {
			recordUnlockFailure(failureKey);
			return c.json({ error: "invalid_password" }, 401);
		}
		unlockFailures.delete(failureKey);

		const payload = `${slug}:${snip.passwordUpdatedAt}`;
		const cookie = signUnlockCookie(payload, requireSessionSecret());
		c.header(
			"Set-Cookie",
			`${cookieNameForSlug(slug)}=${cookie}; HttpOnly; SameSite=Lax; Path=/`,
		);
		return c.body(null, 204);
	});

	app.openapi(postLockRoute, (c) => {
		const { slug } = c.req.valid("param");
		c.header("Set-Cookie", expiredCookieHeader(slug));
		return c.body(null, 204);
	});

	app.openapi(putPasswordRoute, (c) => {
		if (!passwordProtectionEnabled) return c.json({ error: "not_found" }, 404);
		const { slug } = c.req.valid("param");
		const { password } = c.req.valid("json");
		const snip = store.get(slug);
		if (!snip) return c.json({ error: "not_found" }, 404);
		if (
			snip.protected &&
			!hasUnlockCookie(
				c.req.header("cookie") ?? null,
				slug,
				snip.passwordUpdatedAt,
				sessionSecret,
			)
		) {
			return c.json({ error: "locked" }, 401);
		}

		store.setPassword(slug, hashPassword(password));
		c.header("Set-Cookie", expiredCookieHeader(slug));
		return c.body(null, 204);
	});

	app.openapi(deletePasswordRoute, (c) => {
		if (!passwordProtectionEnabled) return c.json({ error: "not_found" }, 404);
		const { slug } = c.req.valid("param");
		const snip = store.get(slug);
		if (!snip) return c.json({ error: "not_found" }, 404);
		if (
			snip.protected &&
			!hasUnlockCookie(
				c.req.header("cookie") ?? null,
				slug,
				snip.passwordUpdatedAt,
				sessionSecret,
			)
		) {
			return c.json({ error: "locked" }, 401);
		}

		store.removePassword(slug);
		c.header("Set-Cookie", expiredCookieHeader(slug));
		return c.body(null, 204);
	});

	app.openapi(putSnipRoute, async (c) => {
		const { slug } = c.req.valid("param");
		const body = c.req.valid("json");

		if (Buffer.byteLength(body.content, "utf8") > MAX_CONTENT_BYTES) {
			return c.json(
				{ error: "content_too_large", message: "Content exceeds 1 MB limit" },
				413,
			);
		}

		const existing = store.get(slug);
		if (
			existing?.protected &&
			!hasUnlockCookie(
				c.req.header("cookie") ?? null,
				slug,
				existing.passwordUpdatedAt,
				sessionSecret,
			)
		) {
			return c.json({ error: "locked" }, 401);
		}

		const passwordHash =
			passwordProtectionEnabled && !existing?.protected && body.password
				? hashPassword(body.password)
				: undefined;
		store.upsert(slug, body.content, passwordHash);
		const snip = store.get(slug);
		bus.publish(slug, {
			content: body.content,
			updatedAt: snip?.updatedAt ?? Date.now(),
			clientId: body.clientId,
		});

		return c.body(null, 204);
	});

	// OpenAPI spec + Scalar API reference
	app.doc("/api/openapi.json", {
		openapi: "3.0.0",
		info: {
			title: "Snippaste API",
			version: "1.0.0",
			description:
				"Real-time collaborative snippet sharing. Snippets sync via SSE; password protection uses scrypt + HMAC-signed cookies.",
		},
	});

	app.get(
		"/api/doc",
		apiReference({
			url: "/api/openapi.json",
			pageTitle: "Snippaste API Reference",
			theme: "default",
			customCss: `
        :root {
          --scalar-color-accent: #6470F0;
          --scalar-font-code: 'IBM Plex Mono', 'JetBrains Mono', monospace;
        }
      `,
		}),
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
