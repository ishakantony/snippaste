import { Hono } from "hono";
import type { SnipStore } from "./store.js";
import { SlugValidator } from "./slugValidator.js";

export function buildApp(store: SnipStore) {
  const app = new Hono();

  app.get("/api/health", (c) => {
    return c.text("OK", 200);
  });

  app.get("/api/snips/:slug", (c) => {
    const result = SlugValidator.validate(c.req.param("slug"));
    if (!result.ok) {
      return c.json({ error: result.reason }, 400);
    }

    const snip = store.get(result.slug);

    if (!snip) {
      return c.json({ error: "not_found" }, 404);
    }

    return c.json(snip, 200);
  });

  app.put("/api/snips/:slug", async (c) => {
    const result = SlugValidator.validate(c.req.param("slug"));
    if (!result.ok) {
      return c.json({ error: result.reason }, 400);
    }

    const body = await c.req.json<{ content: string }>();
    store.upsert(result.slug, body.content);

    return c.body(null, 204);
  });

  return app;
}
