import { randomBytes } from "node:crypto";
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
const SESSION_SECRET =
	env.SESSION_SECRET ?? randomBytes(32).toString("base64url");

if (!env.SESSION_SECRET) {
	console.warn(
		"SESSION_SECRET is not set; unlock sessions will be invalidated on server restart.",
	);
}

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
		autoSave: env.FEATURE_AUTO_SAVE,
		passwordProtection: env.FEATURE_PASSWORD_PROTECTION,
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
	passwordProtectionEnabled: env.FEATURE_PASSWORD_PROTECTION,
	sessionSecret: SESSION_SECRET,
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
	console.log(`Hono server running on http://localhost:${info.port}`);
	runCleanup(store);
	startCleanupJob(store);
});
