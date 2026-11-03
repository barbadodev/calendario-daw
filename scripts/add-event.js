#!/usr/bin/env node
/**
 * CLI para añadir un evento al calendario DAW
 * Uso: node add-event.js --titulo X --modulo Y --tipo Z --fecha A --hora B [--descripcion C] [--todo-el-dia] [--autor D]
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar env desde backend/.env
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, '..', 'backend', '.env'), 'utf-8');
    const vars = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]+)"?$/);
      if (m) vars[m[1]] = m[2];
    }
    return vars;
  } catch {
    return {};
  }
}

// Parsear argumentos
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (['todo-el-dia', 'all-day'].includes(key)) {
        result[key] = true;
      } else {
        result[key] = args[i + 1];
        i++;
      }
    }
  }
  return result;
}

const env = loadEnv();
const args = parseArgs();

const API_URL = process.env.API_URL || env.API_URL_PROD || 'http://localhost:3001';
const SALA = process.env.SALA_CODIGO || env.SALA_CODIGO || 'daw2cordoba2026';

const MODULOS_VALIDOS = ['ipe', 'dwec', 'dwes', 'daw', 'diw', 'en', 'opt', 'proy'];
const TIPOS_VALIDOS = ['examen', 'entrega', 'apunte', 'clase', 'reunion', 'otro'];

if (!args.titulo) { console.error('❌ Falta --titulo'); process.exit(1); }
if (!args.modulo) { console.error('❌ Falta --modulo'); process.exit(1); }
if (!args.fecha) { console.error('❌ Falta --fecha (YYYY-MM-DD)'); process.exit(1); }
if (!MODULOS_VALIDOS.includes(args.modulo)) { console.error(`❌ Módulo inválido. Usa uno de: ${MODULOS_VALIDOS.join(', ')}`); process.exit(1); }
if (args.tipo && !TIPOS_VALIDOS.includes(args.tipo)) { console.error(`❌ Tipo inválido. Usa uno de: ${TIPOS_VALIDOS.join(', ')}`); process.exit(1); }

// Construir fecha
let fechaISO;
if (args['todo-el-dia'] || args['all-day']) {
  fechaISO = `${args.fecha}T00:00:00.000Z`;
} else {
  const hora = args.hora || '09:00';
  fechaISO = `${args.fecha}T${hora}:00.000Z`;
}

const evento = {
  titulo: args.titulo,
  modulo_id: args.modulo,
  tipo_id: args.tipo || 'otro',
  fecha_inicio: fechaISO,
  todo_el_dia: !!(args['todo-el-dia'] || args['all-day']),
  descripcion: args.descripcion || null,
};

const payload = { sala: SALA, evento };

try {
  const res = await fetch(`${API_URL}/api/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('❌ Error del servidor:', err);
    process.exit(1);
  }

  const data = await res.json();
  console.log('✅ Evento añadido:');
  console.log(`   📅 ${data.evento.titulo}`);
  console.log(`   🕐 ${new Date(data.evento.fecha_inicio).toLocaleString('es-ES')}`);
  console.log(`   🎓 ${data.evento.modulo_id.toUpperCase()} - ${data.evento.tipo_id}`);
  if (data.evento.descripcion) console.log(`   📝 ${data.evento.descripcion}`);
  console.log(`   ID: ${data.evento.id}`);
} catch (err) {
  console.error('❌ No se pudo conectar al servidor en', API_URL);
  console.error('   ¿Está el backend corriendo?', err.message);
  process.exit(1);
}
