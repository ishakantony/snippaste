import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), react()],
	root: ".",
	publicDir: "public",
	build: {
		outDir: "dist/client",
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
});
