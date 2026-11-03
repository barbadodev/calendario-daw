#!/usr/bin/env node
/**
 * CLI para listar eventos próximos
 * Uso: node list-events.js [--dias 7] [--modulo dwes] [--desde YYYY-MM-DD]
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

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result[key] = args[i + 1] || true;
      if (args[i + 1]) i++;
    }
  }
  return result;
}

const env = loadEnv();
const cli = parseArgs();
const API_URL = cli.api || env.API_URL_PROD || 'http://localhost:3001';
const SALA = env.SALA_CODIGO || 'daw2cordoba2026';

const dias = parseInt(cli.dias || '14', 10);
const desde = cli.desde || new Date().toISOString().slice(0, 10);
const hasta = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const params = new URLSearchParams({ sala: SALA });
if (cli.desde) params.set('desde', cli.desde);
else if (dias) { params.set('desde', desde); params.set('hasta', hasta); }

const res = await fetch(`${API_URL}/api/eventos?${params}`);
if (!res.ok) { console.error('❌ Error:', await res.text()); process.exit(1); }

const { eventos } = await res.json();
let filtrados = eventos || [];
if (cli.modulo) filtrados = filtrados.filter(e => e.modulo_id === cli.modulo);

if (filtrados.length === 0) {
  console.log('📭 No hay eventos próximos');
  process.exit(0);
}

console.log(`📅 ${filtrados.length} evento(s) hasta el ${hasta}:`);
console.log('');
for (const ev of filtrados) {
  const fecha = new Date(ev.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', weekday: 'short', hour: ev.todo_el_dia ? undefined : '2-digit', minute: ev.todo_el_dia ? undefined : '2-digit' });
  const tag = ev.origen === 'moodle' ? ' 🎓' : '';
  console.log(`  ${ev.id.slice(0, 8)}  ${ev.modulo_id.toUpperCase()}  ${ev.tipo_id.padEnd(7)}  ${fecha}  ${ev.titulo}${tag}`);
}
