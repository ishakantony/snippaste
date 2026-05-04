import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/client/components/ErrorBoundary";
import { SnipPageErrorFallback } from "@/client/components/SnipPageErrorFallback";
import { SnipPageLoadingFallback } from "@/client/components/SnipPageLoadingFallback";
import { LandingPage } from "@/client/pages/LandingPage";

const SnipPage = lazy(() =>
	import("@/client/pages/SnipPage.js").then((m) => ({ default: m.SnipPage })),
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
