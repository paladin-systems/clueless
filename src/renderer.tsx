import "./renderer.css";
import React from 'react';
import { createRoot } from 'react-dom/client';
import AppLayout from './components/AppLayout';

// Simple App wrapper component
const App: React.FC = () => <AppLayout />;

// Get root element and render app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(<App />);
