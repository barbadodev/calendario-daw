import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { iniciarSincronizacionMoodle } from './src/ics-sync.js';
import { router as eventosRouter } from './src/events.js';
import { router as authRouter } from './src/auth.js';
import { router as pushRouter } from './src/push.js';
import { routerEventosExtra, routerGlobal, routerNotasModulo, routerConfig } from './src/extra.js';
import { router as icalRouter } from './src/ical-export.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/eventos', routerEventosExtra);   // completar / duplicar
app.use('/api/notas-modulo', routerNotasModulo);
app.use('/api/config', routerConfig);
app.use('/api/export', icalRouter);
app.use('/api', routerGlobal);                 // stats, sync/now, keepalive, plan-estudio
app.use('/api/push', pushRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Calendario DAW', version: '1.2.0' });
});

// Página simple anti-cold-start que también es útil para verificar en navegador
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Calendario DAW - API</title>
  <style>body{font-family:sans-serif;background:#0f172a;color:#f1f5f9;padding:2rem;}
  a{color:#818cf8;}code{background:#1e293b;padding:2px 6px;border-radius:4px;}</style></head>
  <body><h1>🚀 API del Calendario DAW</h1>
  <p>Backend activo. <strong>Esta es la API, la web está en otra URL.</strong></p>
  <ul>
    <li><a href="/api/health">Health check</a> → <code>/api/health</code></li>
    <li><a href="/api/keepalive">Keep-alive</a> → <code>/api/keepalive</code></li>
    <li>Exportar iCal: <code>/api/export/ics?sala=XXXX</code></li>
    <li>Estadísticas: <code>/api/stats?sala=XXXX</code></li>
  </ul>
  <p>Frontend: <a href="https://calendario-daw-1.onrender.com">calendario-daw-1.onrender.com</a></p>
  </body></html>`);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend calendario DAW corriendo en puerto ${PORT}`);
  iniciarSincronizacionMoodle();
});
