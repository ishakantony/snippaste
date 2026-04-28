import { Hono } from "hono";
import type { SnipStore } from "./store.js";

export function buildApp(store: SnipStore) {
  const app = new Hono();

  app.get("/api/health", (c) => {
    return c.text("OK", 200);
  });

  app.get("/api/snips/:slug", (c) => {
    const slug = c.req.param("slug");
    const snip = store.get(slug);

    if (!snip) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.json(snip, 200);
  });

  app.put("/api/snips/:slug", async (c) => {
    const slug = c.req.param("slug");
    const body = await c.req.json<{ content: string }>();

    store.upsert(slug, body.content);

    return c.body(null, 204);
  });

  return app;
}
