import { serve } from "@hono/node-server";
import { SnipStore } from "./store.js";
import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);

const store = new SnipStore();
const app = createApp(store);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Hono server running on http://localhost:${info.port}`);
});
