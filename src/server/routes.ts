import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SnipStore } from "./store.js";
import { SlugValidator } from "./slugValidator.js";
import { snipBus } from "./snipBus.js";

export interface BuildAppOptions {
  indexHtml?: string;
}

export function buildApp(store: SnipStore, options?: BuildAppOptions) {
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

    const body = await c.req.json<{ content: string; clientId?: string }>();

    if (Buffer.byteLength(body.content, "utf8") > 1_048_576) {
      return c.json(
        { error: "content_too_large", message: "Content exceeds 1 MB limit" },
        413
      );
    }

    store.upsert(result.slug, body.content);

    const updatedAt = Date.now();
    snipBus.publish(result.slug, {
      content: body.content,
      updatedAt,
      clientId: body.clientId,
    });

    return c.body(null, 204);
  });

  app.get("/api/snips/:slug/events", (c) => {
    const result = SlugValidator.validate(c.req.param("slug"));
    if (!result.ok) {
      return c.json({ error: result.reason }, 400);
    }

    const snip = store.get(result.slug);

    return streamSSE(c, async (stream) => {
      if (snip) {
        await stream.writeSSE({
          event: "snapshot",
          data: JSON.stringify({
            content: snip.content,
            updatedAt: snip.updatedAt,
          }),
        });
      }

      const unsub = snipBus.subscribe(result.slug, async (event) => {
        await stream.writeSSE({
          event: "update",
          data: JSON.stringify({
            content: event.content,
            updatedAt: event.updatedAt,
            clientId: event.clientId,
          }),
        });
      });

      stream.onAbort(() => {
        unsub();
      });

      while (true) {
        await stream.sleep(25_000);
        await stream.writeSSE({ event: "ping", data: "" });
      }
    });
  });

  if (options?.indexHtml) {
    const html = options.indexHtml;
    app.get("*", (c) => {
      if (c.req.path.startsWith("/api/")) {
        return c.notFound();
      }
      return c.html(html);
    });
  }

  return app;
}
