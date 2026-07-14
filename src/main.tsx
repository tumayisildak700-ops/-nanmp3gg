import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Patch window.fetch to redirect relative /api/ requests to the deployed backend on Cloud Run
// when the frontend is hosted on static hosting environments (like GitHub Pages, etc.)
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (url.startsWith("/api/") || url.startsWith("api/")) {
    const isStaticHost =
      !window.location.hostname.includes("run.app") &&
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1");

    if (isStaticHost) {
      const backendUrl = "https://ais-pre-uz5exvje5uybgucpklgl4c-242445166252.europe-west1.run.app";
      const cleanPath = url.startsWith("/") ? url : `/${url}`;
      url = `${backendUrl}${cleanPath}`;

      if (typeof input === "string") {
        input = url;
      } else if (input instanceof URL) {
        input = new URL(url);
      } else {
        input = new Request(url, input);
      }
    }
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
