import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function Login({ onLogin }) {
  const [nombre, setNombre] = useState('');
  const [codigoSala, setCodigoSala] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/entrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, codigoSala }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al entrar');
        setCargando(false);
        return;
      }

      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      onLogin(data.usuario);
    } catch (err) {
      setError('No se pudo conectar con el servidor');
      setCargando(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-marca">
          <span className="marca-icono" aria-hidden="true" />
          <span>Curso 2025 / 2026</span>
        </div>

        <h1>Calendario DAW 2º</h1>
        <p className="login-sub">Acceso para los tres compañeros de clase</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-nombre">Nombre</label>
          <input
            id="login-nombre"
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre"
            required
            maxLength={30}
          />

          <label htmlFor="login-sala">Código de sala</label>
          <input
            id="login-sala"
            type="password"
            value={codigoSala}
            onChange={e => setCodigoSala(e.target.value)}
            placeholder="Código compartido"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button className="btn-primary" type="submit" disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
