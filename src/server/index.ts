import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { SnipStore } from "./store.js";
import { buildApp } from "./routes.js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);

const store = new SnipStore();

const app = buildApp(store);

// Serve static assets (JS/CSS/images) from the Vite build first
app.use("/*", serveStatic({ root: "./dist/client" }));

// Cache index.html on boot; serve as SPA fallback for any non-API GET
const spaHtml = await readFile("./dist/client/index.html", "utf8").catch(() => "");
app.get("/*", (c) => {
  if (c.req.path.startsWith("/api/")) return c.notFound();
  return c.html(spaHtml);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
