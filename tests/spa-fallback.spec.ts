import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { buildApp } from "../src/server/routes.js";
import { SnipStore } from "../src/server/store.js";
import { attachSpaFallback } from "../src/server/index.js";

describe("SPA fallback", () => {
  it("serves the React shell for direct snip links", async () => {
    const store = new SnipStore(":memory:");
    const app = buildApp(store);
    attachSpaFallback(app, '<html><body><div id="root"></div></body></html>');

    const res = await app.fetch(new Request("http://localhost/s/anything"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain('<div id="root">');
    store.close();
  });

  it("does not mask unknown API routes", async () => {
    const store = new SnipStore(":memory:");
    const app = buildApp(store);
    attachSpaFallback(app, '<html><body><div id="root"></div></body></html>');

    const res = await app.fetch(new Request("http://localhost/api/unknown"));

    expect(res.status).toBe(404);
    store.close();
  });
});
