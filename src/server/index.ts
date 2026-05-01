import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "fs";
import { SnipStore } from "./store.js";
import { buildApp } from "./routes.js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);

const store = new SnipStore();
const app = buildApp(store);

// Serve static files from the Vite build (production)
app.use("/*", serveStatic({ root: "./dist/client" }));

// SPA fallback: serve index.html for non-API routes
const indexHtml = readFileSync("./dist/client/index.html", "utf8");
app.notFound((c) => {
  if (c.req.path.startsWith("/api")) {
    return c.text("Not Found", 404);
  }
  return c.html(indexHtml);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
