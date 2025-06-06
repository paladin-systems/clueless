import "./renderer.css";
import type React from "react";
import { createRoot } from "react-dom/client";
import AppLayout from "./components/AppLayout";
import ErrorBoundary from "./components/shared/ErrorBoundary";

// Simple App wrapper component with error boundary
const App: React.FC = () => (
  <ErrorBoundary>
    <AppLayout />
  </ErrorBoundary>
);

// Get root element and render app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);
