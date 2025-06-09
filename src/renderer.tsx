import "./renderer.css";
import "./styles/modals.css";
import { HeroUIProvider } from "@heroui/react";
import type React from "react";
import { createRoot } from "react-dom/client";
import AppLayout from "./components/AppLayout";
import ErrorBoundary from "./components/shared/ErrorBoundary";

// Simple App wrapper component with error boundary
const App: React.FC = () => (
  <HeroUIProvider>
    <div className="dark bg-transparent text-foreground">
      <ErrorBoundary>
        <AppLayout />
      </ErrorBoundary>
    </div>
  </HeroUIProvider>
);

// Get root element and render app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);
