import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@excalidraw/excalidraw/index.css";
import "./styles/theme.css";
import "./styles/app.css";
import { App } from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("DrawMesh: #root element is missing from index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
