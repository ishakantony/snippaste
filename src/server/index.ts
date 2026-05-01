import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Hono } from "hono";
import { SnipStore } from "./store.js";
import { buildApp } from "./routes.js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);

export function attachSpaFallback(app: Hono, indexHtml: string, staticRoot?: string): Hono {
  if (staticRoot) {
    app.use("/*", serveStatic({ root: staticRoot }));
  }
  app.get("/*", (c) => {
    if (c.req.path.startsWith("/api/")) {
      return c.notFound();
    }
    return c.html(indexHtml);
  });
  return app;
}

export function createServerApp(store = new SnipStore()): Hono {
  const app = buildApp(store);
  let indexHtml = '<html><body><div id="root"></div></body></html>';
  try {
    indexHtml = readFileSync("./dist/client/index.html", "utf8");
  } catch {
    // Dev mode uses Vite for the client; production builds provide this file.
  }
  return attachSpaFallback(app, indexHtml, "./dist/client");
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const app = createServerApp();
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Hono server running on http://localhost:${info.port}`);
  });
}
