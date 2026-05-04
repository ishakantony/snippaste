import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/client/components/ErrorBoundary.js";
import { SnipPageErrorFallback } from "@/client/components/SnipPageErrorFallback.js";
import { SnipPageLoadingFallback } from "@/client/components/SnipPageLoadingFallback.js";
import { LandingPage } from "@/client/pages/LandingPage.js";

const SnipPage = lazy(() =>
	import("@/client/SnipPage.js").then((m) => ({ default: m.SnipPage })),
);

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route
					path="/s/:name"
					element={
						<ErrorBoundary fallback={<SnipPageErrorFallback />}>
							<Suspense fallback={<SnipPageLoadingFallback />}>
								<SnipPage />
							</Suspense>
						</ErrorBoundary>
					}
				/>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
