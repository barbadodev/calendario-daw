#!/usr/bin/env node
/**
 * CLI para borrar un evento
 * Uso: node delete-event.js <ID>
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const paths = [join(__dirname, '.env'), join(__dirname, '..', 'backend', '.env')];
  for (const p of paths) {
    try {
      const raw = readFileSync(p, 'utf-8');
      const vars = {};
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?$/);
        if (m) vars[m[1]] = m[2];
      }
      if (Object.keys(vars).length) return vars;
    } catch { /* next */ }
  }
  return {};
}

const env = loadEnv();
const API_URL = process.env.API_URL || env.API_URL_PROD || 'http://localhost:3001';
const SALA = env.SALA_CODIGO || 'daw2cordoba2026';

const id = process.argv[2];
if (!id) { console.error('❌ Uso: node delete-event.js <ID>'); process.exit(1); }

const res = await fetch(`${API_URL}/api/eventos/${id}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sala: SALA }),
});

if (res.ok) console.log('✅ Evento eliminado');
else { console.error('❌ Error:', await res.text()); process.exit(1); }
