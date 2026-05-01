import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { SnipStore } from "./store.js";
import { buildApp } from "./routes.js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);

const SHELL_PATH = resolve("./dist/client/index.html");
let spaShell: string | undefined;
try {
  spaShell = readFileSync(SHELL_PATH, "utf8");
} catch {
  spaShell = undefined;
}

const store = new SnipStore();
const app = buildApp(store, {
  spaShell,
  staticMiddleware: serveStatic({ root: "./dist/client" }),
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
