import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/client/components/ErrorBoundary.js";
import { SnipPageFallback } from "@/client/components/SnipPageFallback.js";
import { useDocumentLanguage } from "@/client/hooks/useDocumentLanguage.js";
import { LandingPage } from "@/client/LandingPage.js";

const SnipPage = lazy(() =>
	import("@/client/SnipPage.js").then((m) => ({ default: m.SnipPage })),
);

function LandingPageWithDocLang() {
	useDocumentLanguage();
	return <LandingPage />;
}

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPageWithDocLang />} />
				<Route
					path="/s/:name"
					element={
						<ErrorBoundary fallback={<SnipPageFallback />}>
							<Suspense fallback={<SnipPageFallback />}>
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
