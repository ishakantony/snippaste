import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"bun:sqlite": path.resolve(__dirname, "src/tests/mocks/bun-sqlite.ts"),
		},
	},
	ssr: {
		noExternal: ["drizzle-orm"],
	},
	test: {
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		exclude: [...configDefaults.exclude],
		globals: true,
		setupFiles: ["./src/tests/setup.ts"],
	},
});
