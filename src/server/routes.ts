import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SnipStore } from "./store.js";
import { SlugValidator } from "./slugValidator.js";
import { snipBus } from "./snipBus.js";

export interface BuildAppOptions {
  spaHtml?: string;
}

export function buildApp(store: SnipStore, options: BuildAppOptions = {}) {
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
    const snip = store.get(result.slug)!;

    snipBus.publish(result.slug, {
      content: snip.content,
      updatedAt: snip.updatedAt,
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
    if (!snip) {
      return c.json({ error: "not_found" }, 404);
    }

    return streamSSE(c, async (stream) => {
      // Send initial snapshot so reconnects re-sync
      await stream.writeSSE({
        event: "snapshot",
        data: JSON.stringify({ content: snip.content, updatedAt: snip.updatedAt }),
      });

      // Subscribe to live updates
      const unsub = snipBus.subscribe(result.slug, async (ev) => {
        await stream.writeSSE({
          event: "update",
          data: JSON.stringify({ content: ev.content, updatedAt: ev.updatedAt, clientId: ev.clientId }),
        });
      });

      // Heartbeat every 25 s to keep proxies alive
      const heartbeat = setInterval(async () => {
        await stream.writeSSE({ event: "ping", data: "" });
      }, 25_000);

      stream.onAbort(() => {
        unsub();
        clearInterval(heartbeat);
      });

      // Keep the stream open until client disconnects
      await new Promise<void>((resolve) => {
        stream.onAbort(resolve);
      });
    });
  });

  if (options.spaHtml) {
    const html = options.spaHtml;
    app.get("/*", (c) => {
      if (c.req.path.startsWith("/api/")) return c.notFound();
      return c.html(html);
    });
  }

  return app;
}
