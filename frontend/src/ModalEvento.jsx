import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MODULOS, TIPOS } from './modulos.js';
import { useBloquearScroll } from './useEsMovil.js';

const API_URL = import.meta.env.VITE_API_URL;

export default function ModalEvento({ evento, fechaInicial, usuario, onCrear, onActualizar, onEliminar, onDuplicar, onCerrar }) {
  const esEdicion = !!evento;
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [moduloId, setModuloId] = useState('ipe');
  const [tipoId, setTipoId] = useState('otro');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [todoElDia, setTodoElDia] = useState(false);
  const [enlace, setEnlace] = useState('');
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState('');

  useEffect(() => {
    if (evento) {
      setTitulo(evento.titulo || '');
      setDescripcion(evento.descripcion || '');
      setModuloId(evento.modulo_id || 'ipe');
      setTipoId(evento.tipo_id || 'otro');
      const f = new Date(evento.fecha_inicio);
      setFechaInicio(format(f, 'yyyy-MM-dd'));
      setHoraInicio(format(f, 'HH:mm'));
      setTodoElDia(!!evento.todo_el_dia);
      setEnlace(evento.enlace || '');
      cargarNotas(evento.id);
    } else if (fechaInicial) {
      setFechaInicio(fechaInicial);
    }
  }, [evento, fechaInicial]);

  async function cargarNotas(id) {
    const res = await fetch(`${API_URL}/api/eventos/${id}/notas?sala=${usuario.codigo_sala}`);
    const { notas } = await res.json();
    setNotas(notas || []);
  }

  async function guardarNota(e) {
    e.preventDefault();
    if (!nuevaNota.trim() || !evento) return;
    await fetch(`${API_URL}/api/eventos/${evento.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, contenido: nuevaNota.trim(), autor_id: usuario.id }),
    });
    setNuevaNota('');
    cargarNotas(evento.id);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const fechaCompleta = todoElDia
      ? new Date(fechaInicio + 'T00:00:00').toISOString()
      : new Date(`${fechaInicio}T${horaInicio}:00`).toISOString();

    const payload = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      modulo_id: moduloId,
      tipo_id: tipoId,
      fecha_inicio: fechaCompleta,
      todo_el_dia: todoElDia,
      enlace: enlace.trim() || null,
    };
    esEdicion ? onActualizar(evento.id, payload) : onCrear(payload);
  }

  const esOrigenMoodle = evento?.origen === 'moodle';
  useBloquearScroll(true);

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {esEdicion ? 'Editar evento' : 'Nuevo evento'}
            {esOrigenMoodle && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>(sincronizado con Moodle)</span>}
          </h2>
          <button className="btn-icon" onClick={onCerrar}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Título</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Examen final DWES" required disabled={esOrigenMoodle} />

            <label>Módulo</label>
            <select value={moduloId} onChange={e => setModuloId(e.target.value)} disabled={esOrigenMoodle}>
              {MODULOS.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>

            <label>Tipo</label>
            <select value={tipoId} onChange={e => setTipoId(e.target.value)} disabled={esOrigenMoodle}>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>

            <label>Fecha</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required disabled={esOrigenMoodle} />

            <label>
              <input type="checkbox" checked={todoElDia} onChange={e => setTodoElDia(e.target.checked)}
                style={{ width: 'auto', marginRight: 0.5 }} disabled={esOrigenMoodle} />
              Todo el día
            </label>

            {!todoElDia && <>
              <label>Hora</label>
              <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} disabled={esOrigenMoodle} />
            </>}

            <label>Enlace asociado (opcional)</label>
            <input type="url" value={enlace} onChange={e => setEnlace(e.target.value)}
              placeholder="https://moodle.../practica3" />

            <label>Descripción / apuntes</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Lo que dijo el profesor, temas, enlaces, detalles..."
              disabled={esOrigenMoodle} />

            {esEdicion && (
              <div className="notas-section">
                <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>💬 Notas del grupo ({notas.length})</h3>
                {notas.map(n => (
                  <div key={n.id} className="nota-item">
                    <div className="nota-autor">{n.usuarios?.nombre || 'Anónimo'}</div>
                    <div className="nota-contenido">{n.contenido}</div>
                    <div className="nota-fecha">{format(parseISO(n.created_at), 'd MMM HH:mm', { locale: es })}</div>
                  </div>
                ))}
                <form onSubmit={guardarNota} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <input type="text" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
                    placeholder="Nota rápida para el grupo..." style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-filled" style={{ padding: '0.5rem 0.75rem' }}>+</button>
                </form>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {esEdicion && !esOrigenMoodle && (
              <button type="button" className="btn btn-danger" onClick={() => onEliminar(evento.id)}>Eliminar</button>
            )}
            {esEdicion && (
              <button type="button" className="btn" onClick={() => onDuplicar(evento.id)}>📋 Duplicar +1 día</button>
            )}
            <button type="button" className="btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-filled" disabled={esOrigenMoodle}>
              {esEdicion ? 'Guardar cambios' : 'Crear evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
