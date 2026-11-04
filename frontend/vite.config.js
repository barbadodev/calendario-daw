import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Usamos nuestro propio service worker (public/sw.js) porque gestiona el push;
      // así el build no lo pisa con uno generado.
      strategies: 'injectManifest',
      srcDir: 'public',
      fileName: 'sw.js',
      manifest: {
        name: 'Calendario DAW 2º',
        short_name: 'CalDAW',
        description: 'Calendario colaborativo de 2º DAW',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
