import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/client/components/ErrorBoundary.js";
import { SnipPageFallback } from "@/client/components/SnipPageFallback.js";
import { LandingPage } from "@/client/LandingPage.js";
import { SnipPage } from "@/client/SnipPage.js";

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route
					path="/s/:name"
					element={
						<ErrorBoundary fallback={<SnipPageFallback />}>
							<SnipPage />
						</ErrorBoundary>
					}
				/>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
