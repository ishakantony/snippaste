import { describe, it, expect } from "vitest";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "fs";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";

const indexHtml = readFileSync("./index.html", "utf8");

function buildProdApp(store: SnipStore) {
  const app = buildApp(store);
  app.use("/*", serveStatic({ root: "./dist/client" }));
  app.notFound((c) => {
    if (c.req.path.startsWith("/api")) {
      return c.text("Not Found", 404);
    }
    return c.html(indexHtml);
  });
  return app;
}

describe("SPA fallback", () => {
  it("GET /s/anything returns 200 + HTML with root div", async () => {
    const store = new SnipStore(":memory:");
    const app = buildProdApp(store);

    const res = await app.fetch(new Request("http://localhost/s/anything"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('<div id="root">');
    store.close();
  });

  it("GET /api/unknown returns 404", async () => {
    const store = new SnipStore(":memory:");
    const app = buildProdApp(store);

    const res = await app.fetch(new Request("http://localhost/api/unknown"));
    expect(res.status).toBe(404);
    store.close();
  });
});
