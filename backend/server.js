import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { iniciarSincronizacionMoodle } from './src/ics-sync.js';
import { router as eventosRouter } from './src/events.js';
import { router as authRouter } from './src/auth.js';
import { router as pushRouter } from './src/push.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/push', pushRouter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Calendario DAW', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend calendario DAW corriendo en puerto ${PORT}`);
  iniciarSincronizacionMoodle();
});
