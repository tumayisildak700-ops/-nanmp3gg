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

      // We prioritize devUrl because that's where the latest active code runs during development!
      try {
        const response = await originalFetch(makeRequest(devUrl), init);
        // If it's a successful response, or a client error (like 400, 401, 403, 404 which are valid business logic responses), return it!
        // We only fall back to pre-release if it failed to fetch (throws) or returned a server-side 5xx error / 405.
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 405)) {
          return response;
        }
        console.warn("Dev backend returned status error, trying pre-release backend as fallback:", response.status);
      } catch (err) {
        console.warn("Dev backend failed to fetch, trying pre-release backend as fallback:", err);
      }

      try {
        return await originalFetch(makeRequest(preReleaseUrl), init);
      } catch (err) {
        console.error("Both backends failed to fetch:", err);
        throw err;
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
