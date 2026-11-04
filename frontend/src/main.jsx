import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { initTema } from './tema.js';
import { initEstilo } from './estilos.js';
import './index.css';
import './estilos.css';

initTema();
initEstilo();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registrar service worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
