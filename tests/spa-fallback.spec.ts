import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "@/server/routes.js";
import { SnipStore } from "@/server/store.js";

const SPA_SHELL = `<!doctype html><html><body><div id="root"></div></body></html>`;

describe("SPA fallback", () => {
	let store: SnipStore;
	let app: ReturnType<typeof buildApp>;

	beforeEach(() => {
		store = new SnipStore(":memory:");
		app = buildApp(store, { spaShell: SPA_SHELL });
	});

	afterEach(() => {
		store.close();
	});

	it("GET /s/anything returns 200 HTML with #root", async () => {
		const res = await app.fetch(new Request("http://localhost/s/some-slug"));
		expect(res.status).toBe(200);
		const ct = res.headers.get("content-type") ?? "";
		expect(ct).toContain("text/html");
		const body = await res.text();
		expect(body).toContain('<div id="root">');
	});

	it("GET / returns the SPA shell", async () => {
		const res = await app.fetch(new Request("http://localhost/"));
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toContain('<div id="root">');
	});

	it("GET /api/unknown returns 404 (does not fall through to SPA shell)", async () => {
		const res = await app.fetch(new Request("http://localhost/api/unknown"));
		expect(res.status).toBe(404);
	});

	it("GET /api/snips/:slug for missing slug still returns JSON 404", async () => {
		const res = await app.fetch(
			new Request("http://localhost/api/snips/nonexistent"),
		);
		expect(res.status).toBe(404);
		const body = (await res.json()) as { error: string };
		expect(body.error).toBe("not_found");
	});

	it("non-GET method on a deep link is not served the SPA shell", async () => {
		const res = await app.fetch(
			new Request("http://localhost/s/foo", { method: "POST" }),
		);
		expect(res.status).not.toBe(200);
	});
});
