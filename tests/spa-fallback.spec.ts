import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";

const FAKE_HTML = '<html><body><div id="root"></div></body></html>';

describe("SPA fallback", () => {
  let store: SnipStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    store = new SnipStore(":memory:");
    app = buildApp(store, { spaHtml: FAKE_HTML });
  });

  afterEach(() => {
    store.close();
  });

  it("GET /s/anything returns 200 with index HTML", async () => {
    const res = await app.fetch(new Request("http://localhost/s/my-snip"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<div id="root">');
  });

  it("GET / returns 200 with index HTML", async () => {
    const res = await app.fetch(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<div id="root">');
  });

  it("GET /api/unknown returns 404", async () => {
    const res = await app.fetch(new Request("http://localhost/api/unknown"));
    expect(res.status).toBe(404);
  });

  it("GET /api/health still returns 200", async () => {
    const res = await app.fetch(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
  });
});
