import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "fs";
import { join } from "path";
import type { SnipStore } from "./store.js";
import { buildApp } from "./routes.js";

const INDEX_HTML = readFileSync(
  join(process.cwd(), "dist/client/index.html"),
  "utf8"
);

export function createApp(store: SnipStore) {
  const app = buildApp(store);

  app.use("/*", serveStatic({ root: "./dist/client" }));

  app.get("/*", (c) => {
    if (c.req.path.startsWith("/api/")) {
      return c.notFound();
    }
    return c.html(INDEX_HTML);
  });

  return app;
}
