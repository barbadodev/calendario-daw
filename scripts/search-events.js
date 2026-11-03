#!/usr/bin/env node
/**
 * CLI para buscar eventos por texto
 * Uso: node search-events.js "DWES examen"
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, '..', 'backend', '.env'), 'utf-8');
    const vars = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?$/);
      if (m) vars[m[1]] = m[2];
    }
    return vars;
  } catch { return {}; }
}

const env = loadEnv();
const API_URL = process.env.API_URL || env.API_URL_PROD || 'http://localhost:3001';
const SALA = env.SALA_CODIGO || 'daw2cordoba2026';

const query = process.argv[2];
if (!query) { console.error('❌ Uso: node search-events.js <texto>'); process.exit(1); }

const res = await fetch(`${API_URL}/api/eventos?sala=${SALA}`);
const { eventos } = await res.json();

const texto = query.toLowerCase();
const encontrados = (eventos || []).filter(e =>
  (e.titulo || '').toLowerCase().includes(texto) ||
  (e.descripcion || '').toLowerCase().includes(texto) ||
  (e.modulo_id || '').toLowerCase().includes(texto)
);

if (encontrados.length === 0) {
  console.log(` Sin resultados para: "${query}"`);
  process.exit(0);
}

console.log(`🔍 ${encontrados.length} evento(s) para "${query}":`);
console.log('');
for (const ev of encontrados) {
  console.log(`  ${ev.id.slice(0, 8)}  ${ev.modulo_id.toUpperCase()}  ${new Date(ev.fecha_inicio).toLocaleDateString('es-ES')}  ${ev.titulo}`);
  if (ev.descripcion) console.log(`              ↳ ${ev.descripcion}`);
}
