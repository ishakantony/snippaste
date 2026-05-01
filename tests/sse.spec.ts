import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";

async function* readSSEEvents(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data = line.slice(5).trim();
        }
      }
      yield { event, data };
    }
  }
}

describe("SSE sync", () => {
  let store: SnipStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    store = new SnipStore(":memory:");
    app = buildApp(store);
  });

  afterEach(() => {
    store.close();
  });

  it("subscriber receives update event after PUT", async () => {
    const slug = "sync-test";

    // Seed the snippet
    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "initial" }),
      })
    );

    // Start SSE subscription
    const sseRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}/events`)
    );
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get("content-type")).toContain("text/event-stream");

    const events: Array<{ event: string; data: unknown }> = [];
    const readPromise = (async () => {
      for await (const ev of readSSEEvents(sseRes)) {
        events.push({ event: ev.event, data: JSON.parse(ev.data) });
        if (ev.event === "update") break;
      }
    })();

    // Give SSE a moment to establish subscription
    await new Promise((r) => setTimeout(r, 50));

    // Fire PUT from another "client"
    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated from elsewhere" }),
      })
    );

    await readPromise;

    const snapshot = events.find((e) => e.event === "snapshot");
    expect(snapshot).toBeDefined();
    expect(snapshot!.data).toMatchObject({ content: "initial" });

    const update = events.find((e) => e.event === "update");
    expect(update).toBeDefined();
    expect(update!.data).toMatchObject({ content: "updated from elsewhere" });
  });

  it("PUT echoes clientId in update event; server does not filter", async () => {
    const slug = "sync-client-id";

    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "v1" }),
      })
    );

    const sseRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}/events`)
    );

    const events: Array<{ event: string; data: unknown }> = [];
    const readPromise = (async () => {
      for await (const ev of readSSEEvents(sseRes)) {
        events.push({ event: ev.event, data: JSON.parse(ev.data) });
        if (ev.event === "update") break;
      }
    })();

    await new Promise((r) => setTimeout(r, 50));

    const clientId = "tab-abc-123";
    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "v2", clientId }),
      })
    );

    await readPromise;

    const update = events.find((e) => e.event === "update");
    expect(update).toBeDefined();
    expect((update!.data as Record<string, unknown>).clientId).toBe(clientId);
  });
});
