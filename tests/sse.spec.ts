import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";

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

  it("GET /api/snips/:slug/events returns 404 for missing slug", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/snips/nonexistent/events")
    );
    expect(res.status).toBe(404);
  });

  it("GET /api/snips/:slug/events returns 400 for invalid slug", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/snips/bad.slug!/events")
    );
    expect(res.status).toBe(400);
  });

  it("subscriber receives update event after PUT", async () => {
    // Create the snip first
    await app.fetch(
      new Request("http://localhost/api/snips/test-sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "initial" }),
      })
    );

    const eventsRes = await app.fetch(
      new Request("http://localhost/api/snips/test-sync/events")
    );
    expect(eventsRes.status).toBe(200);
    expect(eventsRes.headers.get("content-type")).toContain("text/event-stream");

    // Read the initial snapshot
    const reader = eventsRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let gotSnapshot = false;
    let snapshotData: { content: string; updatedAt: number } | null = null;

    while (!gotSnapshot) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("event: snapshot")) {
          const dataLine = lines[i + 1];
          if (dataLine?.startsWith("data: ")) {
            snapshotData = JSON.parse(dataLine.slice(6));
            gotSnapshot = true;
            break;
          }
        }
      }
    }

    expect(snapshotData).not.toBeNull();
    expect(snapshotData!.content).toBe("initial");

    // Now do a PUT and expect an update event
    await app.fetch(
      new Request("http://localhost/api/snips/test-sync", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      })
    );

    let gotUpdate = false;
    let updateData: { content: string; updatedAt: number; clientId?: string } | null = null;

    while (!gotUpdate) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("event: update")) {
          const dataLine = lines[i + 1];
          if (dataLine?.startsWith("data: ")) {
            updateData = JSON.parse(dataLine.slice(6));
            gotUpdate = true;
            break;
          }
        }
      }
    }

    expect(updateData).not.toBeNull();
    expect(updateData!.content).toBe("updated");

    reader.cancel();
  });

  it("PUT echoes clientId in update event", async () => {
    await app.fetch(
      new Request("http://localhost/api/snips/test-clientid", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "hello" }),
      })
    );

    const eventsRes = await app.fetch(
      new Request("http://localhost/api/snips/test-clientid/events")
    );
    const reader = eventsRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Skip snapshot
    let gotSnapshot = false;
    while (!gotSnapshot) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("event: snapshot")) gotSnapshot = true;
      }
    }

    // PUT with clientId
    await app.fetch(
      new Request("http://localhost/api/snips/test-clientid", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "world", clientId: "tab-123" }),
      })
    );

    let gotUpdate = false;
    let updateData: { content: string; clientId?: string } | null = null;

    while (!gotUpdate) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("event: update")) {
          const dataLine = lines[i + 1];
          if (dataLine?.startsWith("data: ")) {
            updateData = JSON.parse(dataLine.slice(6));
            gotUpdate = true;
            break;
          }
        }
      }
    }

    expect(updateData).not.toBeNull();
    expect(updateData!.clientId).toBe("tab-123");

    reader.cancel();
  });
});
