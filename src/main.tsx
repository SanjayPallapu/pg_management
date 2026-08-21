import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { finishChunkRecoveryBoot, recoverFromStaleChunk } from './lib/chunkRecovery';

window.addEventListener('vite:preloadError', (event) => {
  const preloadEvent = event as Event & { payload?: unknown };
  if (recoverFromStaleChunk(preloadEvent.payload)) event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  if (recoverFromStaleChunk(event.reason)) event.preventDefault();
});

console.log('main.tsx loaded');

try {
  const root = document.getElementById('root');
  console.log('Root element found:', root);
  
  createRoot(root!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  finishChunkRecoveryBoot();
  console.log('App rendered');
} catch (error) {
  console.error('Error rendering app:', error);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'color: red; padding: 20px;';
  errorDiv.textContent = 'Error: ' + (error instanceof Error ? error.message : String(error));
  document.body.innerHTML = '';
  document.body.appendChild(errorDiv);
}

// Register Service Worker for offline support & Play Store PWA
// Skip SW inside Capacitor native app – the WebView serves assets from the
// local filesystem, and a service worker caching stale HTML/JS causes blank
// white screens after app updates (old index.html references old chunk hashes).
const isCapacitorNative =
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '');

if ('serviceWorker' in navigator && !isCapacitorNative) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/serviceWorker.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
} else if ('serviceWorker' in navigator && isCapacitorNative) {
  // Unregister any previously registered SW inside native app
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
  // Clear all SW caches to prevent stale content
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
}
