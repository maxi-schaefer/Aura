import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import PickerOverlay from "./components/PickerOverlay";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/picker-overlay" element={<PickerOverlay />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);