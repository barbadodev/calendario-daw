import './load-env.js';
import { Router } from 'express';
import { supabaseAdmin } from './db.js';

export const router = Router();

router.post('/entrar', async (req, res) => {
  try {
    const { nombre, codigoSala } = req.body;

    if (!nombre || !codigoSala) {
      return res.status(400).json({ error: 'Nombre y código de sala requeridos' });
    }

    const codigoEsperado = process.env.SALA_CODIGO;
    if (codigoSala !== codigoEsperado) {
      return res.status(401).json({ error: 'Código de sala incorrecto' });
    }

    const { data: existentes } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('nombre', nombre)
      .eq('codigo_sala', codigoSala)
      .limit(1);

    let usuario;
    if (existentes && existentes.length > 0) {
      usuario = existentes[0];
      await supabaseAdmin
        .from('usuarios')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', usuario.id);
    } else {
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

    res.json({ usuario });
  } catch (err) {
    console.error('Error en /auth/entrar:', err);
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
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ usuarios: data });
  } catch (err) {
    console.error('Error en /auth/usuarios:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});
