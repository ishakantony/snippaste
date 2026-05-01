import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SnipStore } from "./store.js";
import { SlugValidator } from "./slugValidator.js";
import * as snipBus from "./snipBus.js";

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

  app.get("/api/snips/:slug/events", async (c) => {
    const result = SlugValidator.validate(c.req.param("slug"));
    if (!result.ok) {
      return c.json({ error: result.reason }, 400);
    }

    const snip = store.get(result.slug);
    if (!snip) {
      return c.json({ error: "not_found" }, 404);
    }

    return streamSSE(c, async (stream) => {
      // Send initial snapshot
      await stream.writeSSE({
        event: "snapshot",
        data: JSON.stringify({
          content: snip.content,
          updatedAt: snip.updatedAt,
        }),
      });

      // Subscribe to updates
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

      // Heartbeat every 25s
      const heartbeat = setInterval(async () => {
        await stream.writeSSE({ event: "ping", data: "" });
      }, 25_000);

      // Cleanup on disconnect
      stream.onAbort(() => {
        clearInterval(heartbeat);
        unsub();
      });

      // Keep the stream alive
      await new Promise(() => {});
    });
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

    const updatedAt = store.upsert(result.slug, body.content);

    snipBus.publish(result.slug, {
      content: body.content,
      updatedAt,
      clientId: typeof body.clientId === "string" && body.clientId.length <= 128
        ? body.clientId
        : undefined,
    });

    return c.body(null, 204);
  });

  return app;
}
