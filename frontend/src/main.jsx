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

// El service worker lo registra vite-plugin-pwa (registerSW.js) con autoUpdate.
