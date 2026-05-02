import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/client/i18n/index.js";
import { ErrorBoundary } from "@/client/components/ErrorBoundary.js";
import "./index.css";
import { App } from "@/client/App.js";
import { ThemeProvider } from "@/client/themeContext.js";

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

createRoot(root).render(
	<StrictMode>
		<ErrorBoundary>
			<ThemeProvider>
				<App />
			</ThemeProvider>
		</ErrorBoundary>
	</StrictMode>,
);
