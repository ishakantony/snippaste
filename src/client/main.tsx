import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/client/i18n/index.js";
import { AutoSaveSettingsProvider } from "@/client/autoSaveSettingsContext.js";
import { ErrorBoundary } from "@/client/components/ErrorBoundary.js";
import { FeatureFlagsProvider } from "@/client/featureFlagsContext.js";
import "./index.css";
import { App } from "@/client/App.js";
import { ThemeProvider } from "@/client/themeContext.js";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

createRoot(root).render(
	<StrictMode>
		<ErrorBoundary>
			<FeatureFlagsProvider>
				<ThemeProvider>
					<AutoSaveSettingsProvider>
						<App />
					</AutoSaveSettingsProvider>
				</ThemeProvider>
			</FeatureFlagsProvider>
		</ErrorBoundary>
	</StrictMode>,
);
