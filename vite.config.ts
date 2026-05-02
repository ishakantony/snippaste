import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import {
	envBoolSchema,
	FLAGS_PLACEHOLDER,
	featureFlagsSchema,
} from "./src/shared/featureFlags.js";

function featureFlagsPlugin(envVars: Record<string, string>): Plugin {
	return {
		name: "inject-feature-flags",
		transformIndexHtml(html) {
			const flags = featureFlagsSchema.parse({
				qrCode: envBoolSchema.parse(envVars.FEATURE_QR_CODE),
				languageSwitcher: envBoolSchema.parse(
					envVars.FEATURE_LANGUAGE_SWITCHER,
				),
				autoSave: envBoolSchema.parse(envVars.FEATURE_AUTO_SAVE),
				passwordProtection: envBoolSchema.parse(
					envVars.FEATURE_PASSWORD_PROTECTION,
				),
			});
			return html.replace(
				FLAGS_PLACEHOLDER,
				`<script>window.__FLAGS__ = ${JSON.stringify(flags)}</script>`,
			);
		},
	};
}

export default defineConfig(({ mode }) => {
	const envVars = loadEnv(mode, process.cwd(), "FEATURE_");

	return {
		plugins: [tailwindcss(), react(), featureFlagsPlugin(envVars)],
		root: ".",
		publicDir: "public",
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "src"),
			},
		},
		build: {
			outDir: "dist/client",
			rollupOptions: {
				output: {
					manualChunks: {
						"vendor-react": ["react", "react-dom", "react-router-dom"],
						"vendor-codemirror": [
							"@codemirror/commands",
							"@codemirror/state",
							"@codemirror/theme-one-dark",
							"@codemirror/view",
						],
					},
				},
			},
		},
		server: {
			port: 5173,
			proxy: {
				"/api": {
					target: "http://localhost:7777",
					changeOrigin: true,
				},
			},
		},
	};
});
