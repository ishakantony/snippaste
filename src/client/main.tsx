import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/client/i18n/index.js";
import { ErrorBoundary } from "@/client/components/ErrorBoundary.js";
import { initializeFeatureFlags } from "@/client/stores/featureFlagsStore.js";
import { bootstrapLanguageStore } from "@/client/stores/languageStore.js";
import { bootstrapThemeStore } from "@/client/stores/themeStore.js";
import { ToastViewport } from "@/client/stores/toastStore.js";
import "./index.css";
import { App } from "@/client/App.js";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

initializeFeatureFlags();
bootstrapLanguageStore();
bootstrapThemeStore();

createRoot(root).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
			<ToastViewport />
		</ErrorBoundary>
	</StrictMode>,
);
