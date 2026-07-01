import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { LocalizationProvider } from "./i18n/index.js";
import "./styles.css";
import "./citymode.css";

createRoot(document.getElementById("root")).render(
  <LocalizationProvider>
    <App />
  </LocalizationProvider>,
);
