import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "@/server/routes.js";
import { SnipStore } from "@/server/store.js";

const TEST_SESSION_SECRET = "test-session-secret";

describe("Hono routes", () => {
	let store: SnipStore;
	let app: ReturnType<typeof buildApp>;

	beforeEach(() => {
		store = new SnipStore(":memory:");
		app = buildApp(store, { sessionSecret: TEST_SESSION_SECRET });
	});

	afterEach(() => {
		store.close();
	});

	it("GET /api/health returns 200 OK", async () => {
		const res = await app.fetch(new Request("http://localhost/api/health"));
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toBe("OK");
	});

	it("GET /api/snips/:slug returns 404 for missing slug", async () => {
		const res = await app.fetch(
			new Request("http://localhost/api/snips/nonexistent"),
		);
		expect(res.status).toBe(404);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("not_found");
	});

	it("PUT then GET round-trip", async () => {
		const slug = "test-slug";
		const content = "Hello, world!";

		const putRes = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			}),
		);
		expect(putRes.status).toBe(204);

		const getRes = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`),
		);
		expect(getRes.status).toBe(200);
		const body = (await getRes.json()) as {
			slug: string;
			content: string;
			updatedAt: number;
			protected: boolean;
		};
		expect(body.slug).toBe(slug);
		expect(body.content).toBe(content);
		expect(typeof body.updatedAt).toBe("number");
		expect(body.protected).toBe(false);
	});

	it("protects a snip created with a password until it is unlocked", async () => {
		const slug = "locked-snip";
		const content = "secret content";

		const putRes = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content, password: "open-sesame" }),
			}),
		);
		expect(putRes.status).toBe(204);

		const lockedGet = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`),
		);
		expect(lockedGet.status).toBe(401);
		expect(await lockedGet.json()).toEqual({ error: "locked" });

		const wrongUnlock = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/unlock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "wrong-password" }),
			}),
		);
		expect(wrongUnlock.status).toBe(401);

		const unlock = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/unlock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "open-sesame" }),
			}),
		);
		expect(unlock.status).toBe(204);
		const cookie = unlock.headers.get("set-cookie");
		expect(cookie).toContain("snip_unlock_locked-snip=");

		const unlockedGet = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				headers: { Cookie: cookie ?? "" },
			}),
		);
		expect(unlockedGet.status).toBe(200);
		const body = (await unlockedGet.json()) as {
			content: string;
			protected: boolean;
		};
		expect(body.content).toBe(content);
		expect(body.protected).toBe(true);
	});

	it("requires unlock for writes to protected snips and supports lock", async () => {
		const slug = "write-locked";
		await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "first", password: "open-sesame" }),
			}),
		);

		const lockedWrite = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "second" }),
			}),
		);
		expect(lockedWrite.status).toBe(401);

		const unlock = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/unlock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "open-sesame" }),
			}),
		);
		const cookie = unlock.headers.get("set-cookie") ?? "";

		const unlockedWrite = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Cookie: cookie },
				body: JSON.stringify({ content: "second" }),
			}),
		);
		expect(unlockedWrite.status).toBe(204);

		const lock = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/lock`, {
				method: "POST",
				headers: { Cookie: cookie },
			}),
		);
		expect(lock.status).toBe(204);
		expect(lock.headers.get("set-cookie")).toContain("Max-Age=0");
	});

	it("changes and removes password protection for an unlocked snip", async () => {
		const slug = "manage-password";
		await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "secret", password: "old-pass" }),
			}),
		);
		const unlock = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/unlock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "old-pass" }),
			}),
		);
		const cookie = unlock.headers.get("set-cookie") ?? "";

		const change = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/password`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Cookie: cookie },
				body: JSON.stringify({ password: "new-pass" }),
			}),
		);
		expect(change.status).toBe(204);

		const oldCookieGet = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				headers: { Cookie: cookie },
			}),
		);
		expect(oldCookieGet.status).toBe(401);

		const newUnlock = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/unlock`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "new-pass" }),
			}),
		);
		const newCookie = newUnlock.headers.get("set-cookie") ?? "";

		const remove = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/password`, {
				method: "DELETE",
				headers: { Cookie: newCookie },
			}),
		);
		expect(remove.status).toBe(204);

		const publicGet = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`),
		);
		expect(publicGet.status).toBe(200);
		expect(((await publicGet.json()) as { protected: boolean }).protected).toBe(
			false,
		);
	});

	it("rate-limits repeated failed unlock attempts per snip and IP", async () => {
		const slug = "rate-limited";
		await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "secret", password: "open-sesame" }),
			}),
		);

		for (let i = 0; i < 5; i++) {
			const res = await app.fetch(
				new Request(`http://localhost/api/snips/${slug}/unlock`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-forwarded-for": "203.0.113.10",
					},
					body: JSON.stringify({ password: "wrong" }),
				}),
			);
			expect(res.status).toBe(401);
		}

		const limited = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}/unlock`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-forwarded-for": "203.0.113.10",
				},
				body: JSON.stringify({ password: "open-sesame" }),
			}),
		);
		expect(limited.status).toBe(429);
	});

	it("does not allow setting new passwords when the feature flag is disabled", async () => {
		app = buildApp(store, { passwordProtectionEnabled: false });
		const res = await app.fetch(
			new Request("http://localhost/api/snips/flag-disabled", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "public", password: "ignored" }),
			}),
		);
		expect(res.status).toBe(204);

		const get = await app.fetch(
			new Request("http://localhost/api/snips/flag-disabled"),
		);
		expect(get.status).toBe(200);
		expect(((await get.json()) as { protected: boolean }).protected).toBe(
			false,
		);

		const passwordEndpoint = await app.fetch(
			new Request("http://localhost/api/snips/flag-disabled/password", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "new-pass" }),
			}),
		);
		expect(passwordEndpoint.status).toBe(404);
	});

	it("GET /api/snips/:slug returns 400 for invalid slug", async () => {
		const res = await app.fetch(
			new Request("http://localhost/api/snips/INVALID%20SLUG"),
		);
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(typeof body.error).toBe("string");
		expect(body.error.length).toBeGreaterThan(0);
	});

	it("PUT /api/snips/:slug returns 400 and does not write for invalid slug", async () => {
		const invalidSlug = "bad.slug!";
		const res = await app.fetch(
			new Request(
				`http://localhost/api/snips/${encodeURIComponent(invalidSlug)}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ content: "should not be stored" }),
				},
			),
		);
		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(typeof body.error).toBe("string");
		expect(body.error.length).toBeGreaterThan(0);

		// Confirm nothing was written — a GET for the same slug (encoded) also 400s,
		// and a direct store lookup via a valid-looking slug finds nothing.
		const storeRes = await app.fetch(
			new Request(`http://localhost/api/snips/bad-slug`),
		);
		expect(storeRes.status).toBe(404);
	});

	it("PUT updates existing snip; subsequent GET returns new content", async () => {
		const slug = "update-me";

		await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "first" }),
			}),
		);

		await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content: "second" }),
			}),
		);

		const getRes = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`),
		);
		const body = (await getRes.json()) as { content: string };
		expect(body.content).toBe("second");
	});

	it("PUT with exactly 1,048,576 bytes of content succeeds with 204", async () => {
		const slug = "size-exact";
		// Build a string whose UTF-8 length is exactly 1,048,576 bytes.
		// ASCII chars are 1 byte each; JSON.stringify wraps with {"content":"..."} so
		// we need the raw content bytes, not the full body bytes.
		const content = "a".repeat(1_048_576);
		expect(Buffer.byteLength(content, "utf8")).toBe(1_048_576);

		const res = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			}),
		);
		expect(res.status).toBe(204);
	});

	it("PUT with 1,048,577 bytes of content returns 413 and does not write", async () => {
		const slug = "size-over";
		const content = "a".repeat(1_048_577);
		expect(Buffer.byteLength(content, "utf8")).toBe(1_048_577);

		const putRes = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content }),
			}),
		);
		expect(putRes.status).toBe(413);
		const body = (await putRes.json()) as { error: string; message: string };
		expect(body.error).toBe("content_too_large");
		expect(typeof body.message).toBe("string");

		// Confirm no DB write occurred
		const getRes = await app.fetch(
			new Request(`http://localhost/api/snips/${slug}`),
		);
		expect(getRes.status).toBe(404);
	});
});
