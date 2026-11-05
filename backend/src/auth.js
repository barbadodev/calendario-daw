import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';

export const router = Router();

/**
 * Normaliza un nombre para comparar:
 * - Quita acentos (Á → A, í → i, ñ → n)
 * - Convierte a minúsculas
 * - Colapsa espacios
 * - Recorta espacios al inicio/final
 */
function normalizarNombre(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca todos los usuarios que comparten nombre normalizado.
 * Devuelve: el "principal" (el último visto), y una lista con los "duplicados" a fusionar.
 */
async function buscarDuplicados(codigoSala, normalizado) {
  const { data: todos } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, last_seen, created_at')
    .eq('codigo_sala', codigoSala);

  const mismos = (todos || []).filter(u => normalizarNombre(u.nombre) === normalizado);
  if (mismos.length <= 1) return { principal: mismos[0] || null, duplicados: [] };

  // Ordenar por last_seen DESC: el más activo gana
  mismos.sort((a, b) => new Date(b.last_seen || b.created_at) - new Date(a.last_seen || a.created_at));
  const [principal, ...resto] = mismos;
  return { principal, duplicados: resto };
}

/**
 * Mueve las referencias (eventos, notas, suscripciones) de usuarios
 * duplicados al usuario principal, y borra los duplicados.
 */
async function fusionarDuplicados(principalId, duplicados) {
  for (const dup of duplicados) {
    // Reasociar datos al usuario principal
    await supabaseAdmin.from('eventos').update({ creado_por: principalId }).eq('creado_por', dup.id);
    await supabaseAdmin.from('notas_evento').update({ autor_id: principalId }).eq('autor_id', dup.id);
    await supabaseAdmin.from('notas_modulo').update({ autor_id: principalId }).eq('autor_id', dup.id);
    // Las suscripciones push duplicadas se eliminan (la del principal gana)
    await supabaseAdmin.from('suscripciones_push').delete().eq('usuario_id', dup.id);
    // Y ahora sí, borrar el usuario duplicado
    await supabaseAdmin.from('usuarios').delete().eq('id', dup.id);
  }
}

router.post('/entrar', async (req, res) => {
  try {
    const { nombre, codigoSala } = req.body;

    if (!nombre || !codigoSala) {
      return res.status(400).json({ error: 'Nombre y código de sala requeridos' });
    }

    if (codigoSala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'Código de sala incorrecto' });
    }

    const normalizado = normalizarNombre(nombre);
    const { principal, duplicados } = await buscarDuplicados(codigoSala, normalizado);

    let usuario;

    if (principal) {
      // Fusionar cualquier duplicado histórico (sin acentos, con mayúsculas, etc.)
      if (duplicados.length > 0) {
        console.log(`🔀 Deduciendo ${duplicados.length} duplicado(s) de "${principal.nombre}"`);
        await fusionarDuplicados(principal.id, duplicados);
      }
      // Actualizar last_seen
      const { data: updated } = await supabaseAdmin
        .from('usuarios')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', principal.id)
        .select()
        .single();
      usuario = updated || principal;
    } else {
      // No existe ninguno: crear con el nombre tal cual lo escribió (preservando acentos visuales)
      const { data: nuevo, error } = await supabaseAdmin
        .from('usuarios')
        .insert({
          nombre: nombre.trim(),
          codigo_sala: codigoSala,
          color_personal: '#6366f1'
        })
        .select()
        .single();
      if (error) throw error;
      usuario = nuevo;
    }

    res.json({ usuario, deduplicados: duplicados.length });
  } catch (err) {
    console.error('Error en /auth/entrar:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /api/auth/actividad — refresca last_seen cuando alguien abre la app con sesión guardada
router.post('/actividad', async (req, res) => {
  try {
    const { usuarioId, sala } = req.body;
    if (!usuarioId || sala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const { error } = await supabaseAdmin
      .from('usuarios')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', usuarioId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Error en /auth/actividad:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/usuarios', async (req, res) => {
  try {
    const codigoSala = req.query.sala;
    if (codigoSala !== process.env.SALA_CODIGO) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, color_personal, last_seen')
      .eq('codigo_sala', codigoSala)
      .order('nombre', { ascending: true });

    if (error) throw error;
    res.json({ usuarios: data });
  } catch (err) {
    console.error('Error en /auth/usuarios:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});
