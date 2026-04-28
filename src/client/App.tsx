import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SnipPage } from "./SnipPage.js";
import { LandingPage } from "./LandingPage.js";

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
