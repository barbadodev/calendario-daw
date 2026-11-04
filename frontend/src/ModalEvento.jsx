import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MODULOS, TIPOS } from './modulos.js';
import { useBloquearScroll } from './useEsMovil.js';
import { IconoCerrar, IconoEnlace } from './Icons.jsx';

const API_URL = import.meta.env.VITE_API_URL;

export default function ModalEvento({ evento, fechaInicial, usuario, onCrear, onActualizar, onEliminar, onDuplicar, onAviso, onCerrar }) {
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
    const res = await fetch(`${API_URL}/api/eventos/${evento.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sala: usuario.codigo_sala, contenido: nuevaNota.trim(), autor_id: usuario.id }),
    });
    if (res.ok) {
      const d = await res.json();
      setNuevaNota('');
      cargarNotas(evento.id);
      if (onAviso) {
        onAviso(d.avisados > 0
          ? `Nota guardada · avisados ${d.avisados} compañero${d.avisados === 1 ? '' : 's'}`
          : 'Nota guardada · nadie tiene las notificaciones activas');
      }
    }
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
            {esOrigenMoodle && <span className="modal-sub">Sincronizado con Moodle</span>}
          </h2>
          <button className="btn-icon" onClick={onCerrar} aria-label="Cerrar">
            <IconoCerrar size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label htmlFor="ev-titulo">Título</label>
            <input id="ev-titulo" type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Examen final DWES" required disabled={esOrigenMoodle} />

            <label htmlFor="ev-modulo">Módulo</label>
            <select id="ev-modulo" value={moduloId} onChange={e => setModuloId(e.target.value)} disabled={esOrigenMoodle}>
              {MODULOS.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>

            <label htmlFor="ev-tipo">Tipo</label>
            <select id="ev-tipo" value={tipoId} onChange={e => setTipoId(e.target.value)} disabled={esOrigenMoodle}>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>

            <div className="campo-fecha-hora">
              <div>
                <label htmlFor="ev-fecha">Fecha</label>
                <input id="ev-fecha" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required disabled={esOrigenMoodle} />
              </div>
              {!todoElDia && (
                <div>
                  <label htmlFor="ev-hora">Hora</label>
                  <input id="ev-hora" type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} disabled={esOrigenMoodle} />
                </div>
              )}
            </div>

            <label className="label-check">
              <input type="checkbox" checked={todoElDia} onChange={e => setTodoElDia(e.target.checked)} disabled={esOrigenMoodle} />
              Todo el día
            </label>

            <label htmlFor="ev-enlace">Enlace asociado (opcional)</label>
            <input id="ev-enlace" type="url" value={enlace} onChange={e => setEnlace(e.target.value)}
              placeholder="https://moodle.../practica3" />

            {esOrigenMoodle && evento.moodle_url && (
              <div style={{ marginTop: '0.85rem' }}>
                <a href={evento.moodle_url} target="_blank" rel="noreferrer"
                  className="btn btn-filled" style={{ display: 'flex', width: '100%' }}>
                  Abrir el curso en Moodle <IconoEnlace size={14} />
                </a>
              </div>
            )}

            <label htmlFor="ev-descripcion">Descripción / apuntes</label>
            {esOrigenMoodle && descripcion ? (
              <div className="descripcion-lectura">{descripcion}</div>
            ) : (
              <textarea id="ev-descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                placeholder="Lo que dijo el profesor, temas, enlaces, detalles…" />
            )}

            {esEdicion && (
              <div className="notas-section">
                <h3>Notas del grupo {notas.length > 0 && <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({notas.length})</span>}</h3>
                {notas.map(n => (
                  <div key={n.id} className="nota-item">
                    <div className="nota-autor">{n.usuarios?.nombre || 'Anónimo'}</div>
                    <div className="nota-contenido">{n.contenido}</div>
                    <div className="nota-fecha">{format(parseISO(n.created_at), 'd MMM HH:mm', { locale: es })}</div>
                  </div>
                ))}
                <form onSubmit={guardarNota} className="nota-form">
                  <input type="text" value={nuevaNota} onChange={e => setNuevaNota(e.target.value)}
                    placeholder="Nota rápida para el grupo…" aria-label="Nueva nota" />
                  <button type="submit" className="btn btn-filled">Añadir</button>
                </form>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {esEdicion && !esOrigenMoodle && (
              <button type="button" className="btn btn-danger btn-eliminar" onClick={() => onEliminar(evento.id)}>Eliminar</button>
            )}
            {esEdicion && (
              <button type="button" className="btn" onClick={() => onDuplicar(evento.id)}>Duplicar +1 día</button>
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
