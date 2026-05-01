import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";
import { snipBus } from "../src/server/snipBus.js";

// ---------------------------------------------------------------------------
// SSE stream reader
// ---------------------------------------------------------------------------

interface SseEvent {
  event: string;
  data: string;
}

/**
 * Reads one complete SSE event block from the stream.
 * Keeps the reader open so you can call again for the next event.
 */
class SseStreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder = new TextDecoder();
  private buffer = "";

  constructor(response: Response) {
    this.reader = response.body!.getReader();
  }

  async readEvent(timeoutMs = 3000): Promise<SseEvent> {
    const deadline = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("SSE read timeout")), timeoutMs)
    );

    while (true) {
      // Check if a complete block is already buffered
      const nlnl = this.buffer.indexOf("\n\n");
      if (nlnl !== -1) {
        const block = this.buffer.slice(0, nlnl);
        this.buffer = this.buffer.slice(nlnl + 2);
        return this.parseBlock(block);
      }

      const { done, value } = await Promise.race([this.reader.read(), deadline]);
      if (done) throw new Error("SSE stream closed unexpectedly");
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  close() {
    this.reader.cancel();
  }

  private parseBlock(block: string): SseEvent {
    const ev: SseEvent = { event: "message", data: "" };
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) ev.event = line.slice(6).trim();
      else if (line.startsWith("data:")) ev.data = line.slice(5).trim();
    }
    return ev;
  }
}

// ---------------------------------------------------------------------------
// snipBus unit tests
// ---------------------------------------------------------------------------

describe("snipBus", () => {
  it("subscriber receives events published to its slug", () => {
    const received: unknown[] = [];
    const unsub = snipBus.subscribe("test-slug", (ev) => received.push(ev));

    snipBus.publish("test-slug", { content: "hello", updatedAt: 1, clientId: "tab-1" });
    unsub();

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ content: "hello", clientId: "tab-1" });
  });

  it("subscriber does not receive events for a different slug", () => {
    const received: unknown[] = [];
    const unsub = snipBus.subscribe("slug-a", (ev) => received.push(ev));

    snipBus.publish("slug-b", { content: "hi", updatedAt: 1, clientId: "x" });
    unsub();

    expect(received).toHaveLength(0);
  });

  it("unsubscribe stops delivery", () => {
    const received: unknown[] = [];
    const unsub = snipBus.subscribe("unsub-slug", (ev) => received.push(ev));
    unsub();

    snipBus.publish("unsub-slug", { content: "nope", updatedAt: 1, clientId: "y" });

    expect(received).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SSE HTTP endpoint tests
// ---------------------------------------------------------------------------

describe("SSE endpoint", () => {
  let store: SnipStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    store = new SnipStore(":memory:");
    app = buildApp(store);
  });

  afterEach(() => {
    store.close();
  });

  it("GET /api/snips/:slug/events returns 200 text/event-stream", async () => {
    await app.fetch(
      new Request("http://localhost/api/snips/ev-snip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "initial" }),
      })
    );

    const res = await app.fetch(
      new Request("http://localhost/api/snips/ev-snip/events")
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    res.body!.cancel();
  });

  it("first event is a snapshot with current content", async () => {
    await app.fetch(
      new Request("http://localhost/api/snips/snap-snip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "snap content" }),
      })
    );

    const res = await app.fetch(
      new Request("http://localhost/api/snips/snap-snip/events")
    );

    const reader = new SseStreamReader(res);
    const snapshot = await reader.readEvent();
    reader.close();

    expect(snapshot.event).toBe("snapshot");
    const data = JSON.parse(snapshot.data);
    expect(data.content).toBe("snap content");
    expect(typeof data.updatedAt).toBe("number");
  });

  it("PUT triggers an update event on a connected subscriber", async () => {
    await app.fetch(
      new Request("http://localhost/api/snips/live-snip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "v1" }),
      })
    );

    const sseRes = await app.fetch(
      new Request("http://localhost/api/snips/live-snip/events")
    );

    const reader = new SseStreamReader(sseRes);

    // Read snapshot first — this proves the subscriber is now registered
    const snapshot = await reader.readEvent();
    expect(snapshot.event).toBe("snapshot");

    // Fire a PUT — subscriber is guaranteed to be active
    await app.fetch(
      new Request("http://localhost/api/snips/live-snip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "v2", clientId: "tab-abc" }),
      })
    );

    const update = await reader.readEvent();
    reader.close();

    expect(update.event).toBe("update");
    const data = JSON.parse(update.data);
    expect(data.content).toBe("v2");
    expect(data.clientId).toBe("tab-abc");
  });

  it("PUT body clientId is echoed back in the update event payload", async () => {
    await app.fetch(
      new Request("http://localhost/api/snips/echo-snip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "initial" }),
      })
    );

    const sseRes = await app.fetch(
      new Request("http://localhost/api/snips/echo-snip/events")
    );

    const reader = new SseStreamReader(sseRes);

    // Read snapshot to confirm subscription is active
    await reader.readEvent();

    await app.fetch(
      new Request("http://localhost/api/snips/echo-snip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "new", clientId: "my-unique-id" }),
      })
    );

    const update = await reader.readEvent();
    reader.close();

    expect(update.event).toBe("update");
    expect(JSON.parse(update.data).clientId).toBe("my-unique-id");
  });

  it("GET /api/snips/:slug/events returns 400 for invalid slug", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/snips/INVALID%20SLUG/events")
    );
    expect(res.status).toBe(400);
  });

  it("GET /api/snips/:slug/events returns 404 for non-existent snip", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/snips/doesnotexist/events")
    );
    expect(res.status).toBe(404);
  });
});
