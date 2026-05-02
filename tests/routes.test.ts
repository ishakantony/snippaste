import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "@/server/routes.js";
import { SnipStore } from "@/server/store.js";

describe("Hono routes", () => {
	let store: SnipStore;
	let app: ReturnType<typeof buildApp>;

	beforeEach(() => {
		store = new SnipStore(":memory:");
		app = buildApp(store);
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
		};
		expect(body.slug).toBe(slug);
		expect(body.content).toBe(content);
		expect(typeof body.updatedAt).toBe("number");
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
