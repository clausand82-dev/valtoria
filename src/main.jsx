import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { LocalizationProvider } from "./i18n/index.js";
import "./styles.css";
import "./app/map/map-dialogs.css";
import "./app/quests/quest-dialogs.css";
import "./app/hero/hero-dialog.css";
import "./app/city-ui.css";
import "./app/ui/wilderness-prompt.css";
// Kept after global styles to preserve the original bestiary cascade order.
import "./app/bestiary.css";
import "./citymode.css";

createRoot(document.getElementById("root")).render(
  <LocalizationProvider>
    <App />
  </LocalizationProvider>,
);
