import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { createApp } from "../src/server/app.js";

describe("SPA fallback", () => {
  let store: SnipStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    store = new SnipStore(":memory:");
    app = createApp(store);
  });

  afterEach(() => {
    store.close();
  });

  it("GET /s/anything returns 200 with SPA html", async () => {
    const res = await app.fetch(new Request("http://localhost/s/anything"));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<div id="root">');
  });

  it("GET /api/unknown returns 404", async () => {
    const res = await app.fetch(new Request("http://localhost/api/unknown"));
    expect(res.status).toBe(404);
  });
});
