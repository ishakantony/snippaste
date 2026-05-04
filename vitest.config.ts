import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"bun:sqlite": path.resolve(__dirname, "tests/mocks/bun-sqlite.ts"),
		},
	},
	ssr: {
		noExternal: ["drizzle-orm"],
	},
	test: {
		environment: "jsdom",
		exclude: [...configDefaults.exclude, "tests/e2e/**"],
		globals: true,
		setupFiles: ["./tests/setup.ts"],
	},
});
