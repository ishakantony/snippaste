import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SnipStore } from "../src/server/store.js";
import { buildApp } from "../src/server/routes.js";

describe("Hono routes", () => {
  let store: SnipStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    store = new SnipStore(":memory:");
    app = buildApp(store);
  });

  afterEach(() => {
    store.close();
  });

  it("GET /api/health returns 200 OK", async () => {
    const res = await app.fetch(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("OK");
  });

  it("GET /api/snips/:slug returns 404 for missing slug", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/snips/nonexistent")
    );
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("not_found");
  });

  it("PUT then GET round-trip", async () => {
    const slug = "test-slug";
    const content = "Hello, world!";

    const putRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
    );
    expect(putRes.status).toBe(204);

    const getRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`)
    );
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as { slug: string; content: string; updatedAt: number };
    expect(body.slug).toBe(slug);
    expect(body.content).toBe(content);
    expect(typeof body.updatedAt).toBe("number");
  });

  it("PUT updates existing snip; subsequent GET returns new content", async () => {
    const slug = "update-me";

    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "first" }),
      })
    );

    await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "second" }),
      })
    );

    const getRes = await app.fetch(
      new Request(`http://localhost/api/snips/${slug}`)
    );
    const body = await getRes.json() as { content: string };
    expect(body.content).toBe("second");
  });
});
