import { zValidator } from "@hono/zod-validator";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import {
	passwordBodySchema,
	slugSchema,
	snipPutBodySchema,
} from "../shared/schemas.js";
import {
	cookieNameForSlug,
	hashPassword,
	signUnlockCookie,
	verifyPassword,
	verifyUnlockCookie,
} from "./passwordAuth.js";
import { SnipBus, type SnipUpdate } from "./snipBus.js";
import type { SnipStore } from "./store.js";

const MAX_CONTENT_BYTES = 1_048_576;
const SSE_HEARTBEAT_MS = 25_000;
const UNLOCK_WINDOW_MS = 10 * 60 * 1000;
const MAX_UNLOCK_FAILURES = 5;

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
	passwordProtectionEnabled?: boolean;
	sessionSecret?: string;
}

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

export function buildApp(store: SnipStore, options: BuildAppOptions = {}) {
	const app = new Hono();
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

	app.get("/api/health", (c) => {
		return c.text("OK", 200);
	});

	app.get(
		"/api/snips/:slug/events",
		zValidator("param", slugParamSchema, slugErrorHook),
		(c) => {
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
				return c.json({ error: "locked" }, 401);
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
		},
	);

	app.post(
		"/api/snips/:slug/unlock",
		zValidator("param", slugParamSchema, slugErrorHook),
		zValidator("json", passwordBodySchema, bodyErrorHook),
		(c) => {
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
		},
	);

	app.post(
		"/api/snips/:slug/lock",
		zValidator("param", slugParamSchema, slugErrorHook),
		(c) => {
			const { slug } = c.req.valid("param");
			c.header("Set-Cookie", expiredCookieHeader(slug));
			return c.body(null, 204);
		},
	);

	app.put(
		"/api/snips/:slug/password",
		zValidator("param", slugParamSchema, slugErrorHook),
		zValidator("json", passwordBodySchema, bodyErrorHook),
		(c) => {
			if (!passwordProtectionEnabled)
				return c.json({ error: "not_found" }, 404);
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
		},
	);

	app.delete(
		"/api/snips/:slug/password",
		zValidator("param", slugParamSchema, slugErrorHook),
		(c) => {
			if (!passwordProtectionEnabled)
				return c.json({ error: "not_found" }, 404);
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
