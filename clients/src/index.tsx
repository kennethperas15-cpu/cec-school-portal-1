import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CecWebsite } from "./components/CecWebsite";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <CecWebsite />
  </StrictMode>,
);