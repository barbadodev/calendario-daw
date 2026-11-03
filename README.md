# Calendario DAW 2º

Aplicación colaborativa de calendario para estudiantes de 2º de DAW, con sincronización automática del calendario de Moodle, notificaciones push al móvil y acceso por código de sala.

## Usuarios

Tres usuarios con acceso por nombre + código de sala compartido. Sin email ni contraseña tradicional.

## Módulos

| Módulo | Color |
|--------|-------|
| IPE | Morado |
| DWEC | Azul |
| DWES | Verde |
| DAW | Naranja |
| DIW | Rosa |
| Inglés | Turquesa |
| Optativa | Amarillo |
| Proyecto | Rojo |

## Despliegue

### 1. Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ejecuta el script `supabase/schema.sql` en el editor SQL de Supabase.
3. Anota:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

### 2. Configurar variables

Copia `backend/.env.example` a `backend/.env` y rellénalo:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
SALA_CODIGO=unCodigoAleatorio
MOODLE_ICAL_URL=laURLPrivadaDeMoodle
VAPID_SUBJECT=mailto:tu@email.com
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Para generar las claves VAPID:

```bash
cd backend
npm install
npx web-push generate-vapid-keys
```

### 3. Render

1. Sube este proyecto a GitHub.
2. En Render: **New → Web Service** → apunta al repositorio.
3. Build command: `cd backend && npm install`
4. Start command: `node server.js`
5. Configura todas las variables de entorno del `.env`.

### 4. Desplegar el frontend

El frontend se puede desplegar en el mismo servicio de Render o en otro (Vercel, Netlify, etc.). Configura en el frontend:

- `VITE_API_URL` = URL del backend en Render
- `VITE_SUPABASE_URL` = URL de Supabase
- `VITE_SUPABASE_ANON_KEY` = Anon key pública de Supabase

### 5. Primer uso

1. Abre la app.
2. Introduce el `SALA_CODIGO` configurado en el backend y tu nombre.
3. Los tres compañeros hacen lo mismo con el mismo código.
4. Cada uno activa las notificaciones desde Ajustes.

## Desarrollo local

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```
