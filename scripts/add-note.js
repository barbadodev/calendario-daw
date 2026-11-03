#!/usr/bin/env node
/**
 * CLI para añadir una nota a un evento
 * Uso: node add-note.js <ID-evento> "Texto de la nota"
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
const contenido = process.argv[3];
if (!id || !contenido) { console.error('❌ Uso: node add-note.js <ID> "contenido"'); process.exit(1); }

const res = await fetch(`${API_URL}/api/eventos/${id}/notas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sala: SALA, contenido, autor_id: null }),
});

if (res.ok) console.log('✅ Nota añadida');
else { console.error('❌ Error:', await res.text()); process.exit(1); }
