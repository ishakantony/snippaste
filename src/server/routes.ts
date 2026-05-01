import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { SnipStore } from "./store.js";
import { SlugValidator } from "./slugValidator.js";
import { publish, subscribe } from "./snipBus.js";

interface PutSnipBody {
  content: string;
  clientId?: string;
}

function normalizeClientId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return undefined;
  return trimmed;
}

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
      await stream.writeSSE({
        event: "snapshot",
        data: JSON.stringify({ content: snip.content, updatedAt: snip.updatedAt }),
      });

      const unsubscribe = subscribe(result.slug, (event) => {
        void stream.writeSSE({
          event: "update",
          data: JSON.stringify(event),
        });
      });

      const heartbeat = setInterval(() => {
        void stream.writeSSE({ event: "ping", data: "" });
      }, 25_000);

      stream.onAbort(() => {
        clearInterval(heartbeat);
        unsubscribe();
      });

      await new Promise<void>((resolve) => {
        stream.onAbort(() => resolve());
      });
    });
  });

  app.put("/api/snips/:slug", async (c) => {
    const result = SlugValidator.validate(c.req.param("slug"));
    if (!result.ok) {
      return c.json({ error: result.reason }, 400);
    }

    const body = await c.req.json<PutSnipBody>();

    if (Buffer.byteLength(body.content, "utf8") > 1_048_576) {
      return c.json(
        { error: "content_too_large", message: "Content exceeds 1 MB limit" },
        413
      );
    }

    store.upsert(result.slug, body.content);
    const saved = store.get(result.slug);
    if (saved) {
      publish(result.slug, {
        content: saved.content,
        updatedAt: saved.updatedAt,
        clientId: normalizeClientId(body.clientId),
      });
    }

    return c.body(null, 204);
  });

  return app;
}
