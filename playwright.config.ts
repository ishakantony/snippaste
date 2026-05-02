import { defineConfig } from "@playwright/test";

const port = 7778;
const baseURL = `http://127.0.0.1:${port}`;
const dbPath = "test-results/e2e/snippaste-e2e.db";
const demo = process.env.E2E_DEMO === "1";

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 30_000,
	fullyParallel: false,
	workers: 1,
	reporter: "list",
	use: {
		baseURL,
		viewport: { width: 1440, height: 900 },
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		launchOptions: {
			slowMo: demo ? 400 : 0,
		},
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
	webServer: {
		command: `node -e "const fs=require('node:fs'); fs.mkdirSync('test-results/e2e', { recursive: true }); fs.rmSync('${dbPath}', { force: true });" && npm run build && npm run build:server && PORT=${port} DB_PATH=${dbPath} FEATURE_QR_CODE=true FEATURE_LANGUAGE_SWITCHER=true FEATURE_AUTO_SAVE=true node dist/server/server/index.js`,
		url: `${baseURL}/api/health`,
		timeout: 120_000,
		reuseExistingServer: false,
	},
});
