# Guía de instalación paso a paso

## 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (gratis).
2. Crea un nuevo proyecto llamado "Calendario DAW".
3. Espera a que se inicialice (puede tardar 1-2 minutos).
4. Ve a **SQL Editor** en el menú lateral.
5. Copia y pega el contenido de `supabase/schema.sql`.
6. Haz clic en **Run**.
7. Ve a **Settings → API** y copia:
   - `Project URL` (ej: `https://xxxxx.supabase.co`)
   - `service_role key` (la clave secreta, NO la anon key)
   - `anon public key` (esta sí es pública)

## 2. Generar claves VAPID para notificaciones

Abre una terminal en la carpeta del proyecto:

```bash
cd backend
npm install
npx web-push generate-vapid-keys
```

Copia las tres claves que te devuelva:
- `subject`: usa tu email (ej: `mailto:tuemail@ejemplo.com`)
- `publicKey`
- `privateKey`

## 3. Configurar el backend

Copia el archivo `.env.example` a `.env` en la carpeta `backend`:

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y rellena:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
SALA_CODIGO=daw2cordoba2026
MOODLE_ICAL_URL=https://educacionadistancia.../export.php?token=xxx
VAPID_SUBJECT=mailto:tuemail@ejemplo.com
VAPID_PUBLIC_KEY=BBBB...
VAPID_PRIVATE_KEY=AAAA...
```

**IMPORTANTE**: 
- No compartas la URL de Moodle ni las service_role keys.
- La URL de Moodle la sacas desde tu calendario de Moodle (la misma que usaste para descargar el .ics).

## 4. Subir a GitHub

```bash
cd calendario-daw
git init
git add .
git commit -m "Primer commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/calendario-daw.git
git push -u origin main
```

## 5. Desplegar backend en Render

1. Ve a [render.com](https://render.com) y crea una cuenta (puedes usar GitHub).
2. Click en **New → Web Service**.
3. Conecta tu repositorio de GitHub.
4. Configura:
   - **Name**: `calendario-daw-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
5. En **Environment**, añade todas las variables del `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `SALA_CODIGO`
   - `MOODLE_ICAL_URL`
   - `VAPID_SUBJECT`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
6. Click en **Create Web Service**.
7. Espera a que se despliegue y copia la URL (ej: `https://calendario-daw-backend.onrender.com`).

## 6. Configurar y desplegar frontend

Copia `frontend/.env.example` a `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

Edita `frontend/.env`:

```
VITE_API_URL=https://calendario-daw-backend.onrender.com
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**IMPORTANTE**: En el frontend usa la `anon key` de Supabase, NO la `service_role key`.

### Opción A: Desplegar en Render (junto al backend)

1. En Render, click en **New → Static Site**.
2. Conecta el mismo repositorio.
3. Configura:
   - **Name**: `calendario-daw-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. En **Environment**, añade:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click en **Create Static Site**.

### Opción B: Desplegar en Vercel (alternativa)

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta.
2. Click en **New Project** → importa tu repositorio.
3. Configura:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. En **Environment Variables**, añade las mismas variables.
5. Click en **Deploy**.

## 7. Primer uso

1. Abre la URL del frontend (ej: `https://calendario-daw-frontend.vercel.app`).
2. Introduce tu nombre y el código de sala (`daw2cordoba2026`).
3. Comparte el código con tus 2 compañeros.
4. Cada uno activa las notificaciones desde **Ajustes**.

## 8. Probar en local (opcional)

Si quieres probar antes de desplegar:

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## Notas importantes

- La sincronización con Moodle se hace cada 15 minutos automáticamente.
- Si un profesor crea una tarea nueva en Moodle, aparecerá en vuestro calendario en menos de 15 minutos.
- Las tareas de Moodle aparecen marcadas con 🎓 y no se pueden editar desde la app (se actualizan desde Moodle).
- Los eventos que creéis vosotros (apuntes del profesor, reuniones, etc.) son manuales y se sincronizan en tiempo real entre los 3.
- Las notificaciones push solo funcionan en navegadores modernos y requieren HTTPS.

## Soporte

Si algo no funciona:
1. Revisa la consola del navegador (F12 → Console) para errores del frontend.
2. Revisa los logs del backend en Render.
3. Verifica que todas las variables de entorno estén bien configuradas.
4. Comprueba que la URL de Moodle sea accesible (prueba abrirla en una pestaña de incógnito).
