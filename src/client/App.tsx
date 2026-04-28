import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SnipPage } from "./SnipPage.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/s/:name" element={<SnipPage />} />
        <Route path="/" element={<Navigate to="/s/untitled" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
