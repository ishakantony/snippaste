import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/client/i18n/index.js";
import { ErrorBoundary } from "@/client/components/ErrorBoundary";
import { initializeFeatureFlags } from "@/client/stores/featureFlagsStore";
import { bootstrapLanguageStore } from "@/client/stores/languageStore";
import { bootstrapThemeStore } from "@/client/stores/themeStore";
import { ToastViewport } from "@/client/stores/toastStore";
import "./index.css";
import { App } from "@/client/App";

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
