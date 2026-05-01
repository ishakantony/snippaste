import { describe, expect, it } from "vitest";
import { buildApp } from "../src/server/routes.js";
import { SnipStore } from "../src/server/store.js";

async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, needle: string) {
  const decoder = new TextDecoder();
  let text = "";
  for (let i = 0; i < 10; i++) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.includes(needle)) return text;
  }
  return text;
}

describe("snip events", () => {
  it("broadcasts updates to subscribers", async () => {
    const store = new SnipStore(":memory:");
    const app = buildApp(store);
    const slug = "live-snip";

    await app.fetch(new Request(`http://localhost/api/snips/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "initial" }),
    }));

    const eventRes = await app.fetch(new Request(`http://localhost/api/snips/${slug}/events`));
    expect(eventRes.status).toBe(200);
    const reader = eventRes.body!.getReader();
    await readUntil(reader, "event: snapshot");

    await app.fetch(new Request(`http://localhost/api/snips/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "changed", clientId: "client-a" }),
    }));

    const text = await readUntil(reader, "event: update");
    expect(text).toContain("event: update");
    expect(text).toContain('"content":"changed"');
    expect(text).toContain('"clientId":"client-a"');
    await reader.cancel();
    store.close();
  });

  it("echoes clientId so clients can filter self updates", async () => {
    const store = new SnipStore(":memory:");
    const app = buildApp(store);
    const slug = "echo-snip";

    await app.fetch(new Request(`http://localhost/api/snips/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "initial" }),
    }));

    const eventRes = await app.fetch(new Request(`http://localhost/api/snips/${slug}/events`));
    const reader = eventRes.body!.getReader();
    await readUntil(reader, "event: snapshot");

    await app.fetch(new Request(`http://localhost/api/snips/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "mine", clientId: "same-client" }),
    }));

    const text = await readUntil(reader, "same-client");
    expect(text).toContain("event: update");
    expect(text).toContain('"clientId":"same-client"');
    await reader.cancel();
    store.close();
  });
});
