import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('main.tsx loaded');

try {
  const root = document.getElementById('root');
  console.log('Root element found:', root);
  
  createRoot(root!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('App rendered');
} catch (error) {
  console.error('Error rendering app:', error);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'color: red; padding: 20px;';
  errorDiv.textContent = 'Error: ' + (error instanceof Error ? error.message : String(error));
  document.body.innerHTML = '';
  document.body.appendChild(errorDiv);
}
