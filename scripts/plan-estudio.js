#!/usr/bin/env node
/**
 * CLI: plan de estudio por semanas
 * Uso: node plan-estudio.js
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

const res = await fetch(`${API_URL}/api/plan-estudio?sala=${SALA}`);
if (!res.ok) { console.error('❌ Error:', await res.text()); process.exit(1); }

const { semanas } = await res.json();
if (!semanas?.length) { console.log('📭 No tienes eventos pendientes.'); process.exit(0); }

console.log('📚 Plan de estudio (próximas semanas)\n');
for (const s of semanas) {
  const nivel = s.cargaHorasEstimadas >= 12 ? '🔴' : s.cargaHorasEstimadas >= 6 ? '🟡' : '🟢';
  console.log(`${nivel} ${s.semana}  ·  ${s.examenes} exámenes + ${s.entregas} entregas  ·  ${s.cargaHorasEstimadas}h de estudio aprox`);
  for (const ev of s.eventos.slice(0, 5)) {
    const marca = ev.completado ? '✓' : '';
    console.log(`    [${marca}] ${ev.fecha.slice(0,10)} ${ev.modulo.toUpperCase()} · ${ev.titulo}`);
  }
  console.log('');
}
