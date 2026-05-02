import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import {
	FLAGS_PLACEHOLDER,
	featureFlagsSchema,
} from "../shared/featureFlags.js";
import { runCleanup, startCleanupJob } from "./cleanup.js";
import { env } from "./env.js";
import { buildApp } from "./routes.js";
import { SnipStore } from "./store.js";

const PORT = env.PORT;

const SHELL_PATH = resolve("./dist/client/index.html");
let spaShell: string | undefined;
try {
	spaShell = readFileSync(SHELL_PATH, "utf8");
} catch {
	spaShell = undefined;
}

if (spaShell) {
	const flags = featureFlagsSchema.parse({
		qrCode: env.FEATURE_QR_CODE,
		languageSwitcher: env.FEATURE_LANGUAGE_SWITCHER,
	});
	spaShell = spaShell.replace(
		FLAGS_PLACEHOLDER,
		`<script>window.__FLAGS__ = ${JSON.stringify(flags)}</script>`,
	);
}

const store = new SnipStore();
const app = buildApp(store, {
	spaShell,
	staticMiddleware: serveStatic({ root: "./dist/client" }),
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
	console.log(`Hono server running on http://localhost:${info.port}`);
	runCleanup(store);
	startCleanupJob(store);
});
