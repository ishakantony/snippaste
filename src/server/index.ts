import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { SnipStore } from "./store.js";
import { buildApp } from "./routes.js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);

const store = new SnipStore();

let indexHtml: string | undefined;
const indexPath = resolve("./dist/client/index.html");
try {
  indexHtml = readFileSync(indexPath, "utf8");
} catch {
  // dev mode — no built index.html yet
}

const app = buildApp(store, { indexHtml });

app.use("/*", serveStatic({ root: "./dist/client" }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
