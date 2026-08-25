import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { finishChunkRecoveryBoot, recoverFromStaleChunk } from './lib/chunkRecovery';
import { Capacitor } from '@capacitor/core';

window.addEventListener('vite:preloadError', (event) => {
  const preloadEvent = event as Event & { payload?: unknown };
  if (recoverFromStaleChunk(preloadEvent.payload)) event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  if (recoverFromStaleChunk(event.reason)) event.preventDefault();
});

console.log('main.tsx loaded, platform:', Capacitor.getPlatform());

// Native Capacitor WebView asset recovery & SW cleanup
const isNativeApp = Capacitor.isNativePlatform();

if ('serviceWorker' in navigator) {
  if (isNativeApp) {
    // Unregister all service workers on native platform asynchronously without blocking
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });

    // Clear all Cache Storage to ensure fresh local assets
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  } else {
    // Web / PWA only
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
  }
}

try {
  const root = document.getElementById('root');
  console.log('Root element found:', root);

  if (root) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    finishChunkRecoveryBoot();
    console.log('App rendered');
  }
} catch (error) {
  console.error('Error rendering app:', error);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'color: #ef4444; padding: 24px; font-family: system-ui, sans-serif; text-align: center; background: #0f172a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;';
  errorDiv.innerHTML = `
    <h2 style="margin:0 0 10px 0; color: #ffffff;">App Startup Failed</h2>
    <p style="font-size: 14px; color: #94a3b8; max-width: 320px;">${error instanceof Error ? error.message : String(error)}</p>
    <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 14px;">Reload App</button>
  `;
  document.body.innerHTML = '';
  document.body.appendChild(errorDiv);
}
