import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Patch window.fetch to redirect relative /api/ requests to the deployed backend on Cloud Run
// when the frontend is hosted on static hosting environments (like GitHub Pages, etc.)
const originalFetch = window.fetch;
const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url, window.location.origin);
  } catch (e) {
    return originalFetch(input, init);
  }

  if (parsedUrl.pathname.startsWith("/api/")) {
    const isStaticHost =
      !window.location.hostname.includes("run.app") &&
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1");

    if (isStaticHost) {
      const cleanPath = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
      const preReleaseUrl = `https://ais-pre-uz5exvje5uybgucpklgl4c-242445166252.europe-west1.run.app${cleanPath}`;
      const devUrl = `https://ais-dev-uz5exvje5uybgucpklgl4c-242445166252.europe-west1.run.app${cleanPath}`;

      const makeRequest = (targetUrl: string) => {
        if (typeof input === "string") {
          return targetUrl;
        } else if (input instanceof URL) {
          return new URL(targetUrl);
        } else {
          return new Request(targetUrl, input);
        }
      };

      try {
        return await originalFetch(makeRequest(preReleaseUrl), init);
      } catch (err) {
        console.warn("Pre-release backend failed, trying dev backend as fallback:", err);
        try {
          return await originalFetch(makeRequest(devUrl), init);
        } catch (devErr) {
          console.error("Both backends failed to fetch:", devErr);
          throw devErr;
        }
      }
    }
  }

  return originalFetch(input, init);
};

try {
  // Try assigning directly
  (window as any).fetch = customFetch;
} catch (e) {
  try {
    // If direct assignment fails (e.g. getter-only property in sandbox), try Object.defineProperty
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (err) {
    console.warn("Could not patch window.fetch. This is expected in some secure sandbox environments.", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
