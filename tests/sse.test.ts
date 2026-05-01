import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";
import { snipBus } from "../src/server/snipBus.js";

const INDEX_HTML = "<html><body><div id='root'></div></body></html>";

async function collectSSE(
  body: ReadableStream<Uint8Array>,
  opts?: { maxEvents?: number; maxWaitMs?: number }
): Promise<Array<{ event: string; data: string }>> {
  const maxEvents = opts?.maxEvents ?? 5;
  const maxWaitMs = opts?.maxWaitMs ?? 1500;

  return new Promise((resolve, reject) => {
    const events: Array<{ event: string; data: string }> = [];
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reader.cancel();
        resolve(events);
      }
    }, maxWaitMs);

    function finish() {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reader.cancel();
        resolve(events);
      }
    }

    function parseBuffer() {
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.trim()) continue;
        let event = "";
        let data = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data = line.slice(5).trim();
        }
        if (event && data) {
          events.push({ event, data });
          if (events.length >= maxEvents) {
            finish();
            return;
          }
        }
      }
    }

    (function read() {
      reader.read().then(
        ({ done, value }) => {
          if (done) {
            parseBuffer();
            finish();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          parseBuffer();
          if (!settled) read();
        },
        (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        }
      );
    })();
  });
}

describe("SSE endpoint", () => {
  let store: SnipStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    snipBus._reset();
    store = new SnipStore(":memory:");
    app = buildApp(store, { indexHtml: INDEX_HTML });
  });

  afterEach(() => {
    store.close();
  });

  it("subscriber receives update event when another client PUTs", async () => {
    const slug = "sync-test";

    const sseRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}/events`)
    );
    expect(sseRes.status).toBe(200);

    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "hello from A" }),
      })
    );

    const events = await collectSSE(sseRes.body!, { maxEvents: 1, maxWaitMs: 1000 });
    const updateEvents = events.filter((e) => e.event === "update");
    expect(updateEvents.length).toBeGreaterThanOrEqual(1);

    const payload = JSON.parse(updateEvents[0].data);
    expect(payload.content).toBe("hello from A");
    expect(typeof payload.updatedAt).toBe("number");
  });

  it("update event echoes clientId from PUT body", async () => {
    const slug = "echo-test";

    const sseRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}/events`)
    );

    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "test", clientId: "tab-abc-123" }),
      })
    );

    const events = await collectSSE(sseRes.body!, { maxEvents: 1, maxWaitMs: 1000 });
    const updateEvents = events.filter((e) => e.event === "update");
    expect(updateEvents.length).toBeGreaterThanOrEqual(1);

    const payload = JSON.parse(updateEvents[0].data);
    expect(payload.clientId).toBe("tab-abc-123");
  });

  it("SSE returns 400 for invalid slug", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/snips/BAD%20SLUG/events")
    );
    expect(res.status).toBe(400);
  });

  it("subscriber receives snapshot event with current content", async () => {
    const slug = "snapshot-test";
    store.upsert(slug, "existing content");

    const sseRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}/events`)
    );
    expect(sseRes.status).toBe(200);

    const events = await collectSSE(sseRes.body!, { maxEvents: 1, maxWaitMs: 1000 });
    const snapshotEvents = events.filter((e) => e.event === "snapshot");
    expect(snapshotEvents.length).toBeGreaterThanOrEqual(1);

    const payload = JSON.parse(snapshotEvents[0].data);
    expect(payload.content).toBe("existing content");
  });
});
