#!/usr/bin/env node
/**
 * CLI para añadir un evento al calendario DAW
 * Uso: node add-event.js --titulo X --modulo Y --tipo Z --fecha A [--hora B] [--todo-el-dia] [--descripcion C] [--enlace D]
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const tryPaths = [
    join(__dirname, '.env'),               // scripts/.env (primera opción)
    join(__dirname, '..', 'backend', '.env') // backend/.env (desarrollo local)
  ];
  for (const p of tryPaths) {
    try {
      const raw = readFileSync(p, 'utf-8');
      const vars = {};
      for (const line of raw.split('\n')) {
        const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?$/);
        if (m) vars[m[1]] = m[2];
      }
      return vars;
    } catch { /* sigue buscando */ }
  }
  return {};
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (['todo-el-dia', 'all-day'].includes(key)) result[key] = true;
      else { result[key] = args[i + 1]; if (args[i + 1] !== undefined) i++; }
    }
  }
  return result;
}

const env = loadEnv();
const cli = parseArgs();
const API_URL = cli.api || env.API_URL_PROD || env.SUPABASE_URL?.replace(/supabase\.co$/, 'onrender.com') || 'http://localhost:3001';
const SALA = env.SALA_CODIGO || 'daw2cordoba2026';

const MODULOS_VALIDOS = ['ipe', 'dwec', 'dwes', 'daw', 'diw', 'en', 'opt', 'proy'];
const TIPOS_VALIDOS = ['examen', 'entrega', 'apunte', 'clase', 'reunion', 'otro'];

if (!cli.titulo) { console.error('❌ Falta --titulo'); process.exit(1); }
if (!cli.modulo) { console.error('❌ Falta --modulo'); process.exit(1); }
if (!cli.fecha) { console.error('❌ Falta --fecha (YYYY-MM-DD)'); process.exit(1); }
if (!MODULOS_VALIDOS.includes(cli.modulo)) { console.error(`❌ Módulo inválido. Usa: ${MODULOS_VALIDOS.join(', ')}`); process.exit(1); }
if (cli.tipo && !TIPOS_VALIDOS.includes(cli.tipo)) { console.error(`❌ Tipo inválido. Usa: ${TIPOS_VALIDOS.join(', ')}`); process.exit(1); }

let fechaISO;
if (cli['todo-el-dia']) {
  fechaISO = `${cli.fecha}T00:00:00.000Z`;
} else {
  const hora = cli.hora || '09:00';
  fechaISO = `${cli.fecha}T${hora}:00.000Z`;
}

const evento = {
  titulo: cli.titulo,
  modulo_id: cli.modulo,
  tipo_id: cli.tipo || 'otro',
  fecha_inicio: fechaISO,
  todo_el_dia: !!cli['todo-el-dia'],
  descripcion: cli.descripcion || null,
  enlace: cli.enlace || null,
};

try {
  const res = await fetch(`${API_URL}/api/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sala: SALA, evento }),
  });
  if (!res.ok) { console.error('❌ Error del servidor:', await res.text()); process.exit(1); }
  const data = await res.json();
  console.log('✅ Evento añadido');
  console.log(`   📅 ${data.evento.titulo}`);
  console.log(`   🕐 ${new Date(data.evento.fecha_inicio).toLocaleString('es-ES')}`);
  console.log(`   🎓 ${data.evento.modulo_id.toUpperCase()} · ${data.evento.tipo_id}`);
  if (data.evento.descripcion) console.log(`   📝 ${data.evento.descripcion.slice(0, 80)}${data.evento.descripcion.length > 80 ? '...' : ''}`);
  console.log(`   ID: ${data.evento.id}`);
} catch (err) {
  console.error('❌ No se pudo conectar al servidor en', API_URL);
  console.error('   ¿Está el backend corriendo? Prueba: GET ' + API_URL + '/api/health');
  process.exit(1);
}
