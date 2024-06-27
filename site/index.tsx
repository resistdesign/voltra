import "@picocss/pico";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const appRootElement = document.getElementById("app-root");

if (appRootElement) {
  const root = createRoot(appRootElement);

  root.render(<App />);
}
