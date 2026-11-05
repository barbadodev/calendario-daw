#!/usr/bin/env node
/**
 * CLI para añadir una nota a un evento o al tablón de un módulo
 * Uso:
 *   node add-note.js <ID-evento> "Texto de la nota"
 *   node add-note.js --modulo <codigoModulo> "Texto de la nota"
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

const args = process.argv.slice(2);

let url = '';
let payload = {};

if (args[0] === '--modulo' || args[0] === '-m') {
  const modulo = args[1];
  const contenido = args.slice(2).join(' ');
  if (!modulo || !contenido) {
    console.error('❌ Uso: node add-note.js --modulo <moduloId> "contenido"');
    process.exit(1);
  }
  url = `${API_URL}/api/notas-modulo/${modulo}`;
  payload = { sala: SALA, contenido, autor_id: null };
} else {
  const id = args[0];
  const contenido = args.slice(1).join(' ');
  if (!id || !contenido) {
    console.error('❌ Uso: node add-note.js <ID-evento> "contenido"');
    console.error('       node add-note.js --modulo <moduloId> "contenido"');
    process.exit(1);
  }
  url = `${API_URL}/api/eventos/${id}/notas`;
  payload = { sala: SALA, contenido, autor_id: null };
}

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

if (res.ok) console.log('✅ Nota añadida correctamente');
else { console.error('❌ Error:', await res.text()); process.exit(1); }
