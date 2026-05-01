import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./LandingPage.js";
import { SnipPage } from "./SnipPage.js";

export function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/s/:name" element={<SnipPage />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
