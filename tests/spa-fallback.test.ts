import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Snippaste</title></head>
  <body><div id="root"></div></body>
</html>`;

describe("SPA fallback", () => {
  let store: SnipStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    store = new SnipStore(":memory:");
    app = buildApp(store, { indexHtml: INDEX_HTML });
  });

  afterEach(() => {
    store.close();
  });

  it("GET /s/anything returns 200 with HTML containing #root", async () => {
    const res = await app.fetch(new Request("http://localhost/s/random-thing-123"));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div id="root">');
  });

  it("GET /s/<slug> returns 200 with text/html content-type", async () => {
    const res = await app.fetch(new Request("http://localhost/s/my-snippet"));
    expect(res.status).toBe(200);
    const ct = res.headers.get("content-type");
    expect(ct).toContain("text/html");
  });

  it("GET /api/unknown still returns 404", async () => {
    const res = await app.fetch(new Request("http://localhost/api/unknown"));
    expect(res.status).toBe(404);
  });

  it("GET / (root) returns 200 with HTML", async () => {
    const res = await app.fetch(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div id="root">');
  });
});
