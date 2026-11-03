# Despliegue en Render (paso a paso)

## Requisitos previos

- Cuenta en [GitHub](https://github.com) (ya la tienes)
- Cuenta en [Render](https://render.com) (gratis)

---

## FASE A — Subir el proyecto a GitHub (sin CLI)

### A1. Crear el repositorio

1. Ve a https://github.com/new
2. Rellena:
   - **Repository name**: `calendario-daw`
   - **Visibility**: Private
   - ❌ NO marques "Add a README"
3. Click en **Create repository**

### A2. Subir archivos manualmente

1. En la página del repositorio recién creado, pulsa el enlace **"uploading an existing file"**.
2. Abre el explorador de Windows y ve a `C:\Users\barba\calendario-daw`.
3. **Selecciona TODO** (Ctrl+A) EXCEPTO las carpetas `node_modules` y los archivos `.env` (son sensibles).
4. Arrastra los archivos a la ventana del navegador de GitHub.
5. Al final, escribe commit message: `primer commit`
6. Click en **Commit changes**.

> ⚠️ IMPORTANTE: NO subas `backend/.env` ni `frontend/.env` a GitHub. Solo subimos `.env.example`. Las claves van directas a Render.

---

## FASE B — Crear servicio Backend en Render

### B1. Nuevo Web Service

1. Ve a https://dashboard.render.com
2. Click **New** → **Web Service**
3. En "Connect a Git Repository" busca `calendario-daw` y conéctalo (te pedirá autorización GitHub la primera vez).
4. En "New Web Service":
   - **Name**: `calendario-daw-backend`
   - **Region**: Europe (paris)
   - **Root Directory**: `./backend`
   - **Runtime**: Node
   - **Build command**: `npm install`
   - **Start command**: `node server.js`
   - **Instance type**: **Free**

### B2. Variables de entorno (Environment)

En la misma pantalla, sección **Environment**, añade estas 8 claves (cópialas del archivo `backend/.env` de tu PC):

| KEY | VALUE |
|-----|-------|
| `SUPABASE_URL` | `https://ninvnzqkpelswmiqnjhp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(la sb_secret_...)* |
| `SUPABASE_ANON_KEY` | *(la sb_publishable_...)* |
| `SALA_CODIGO` | `daw2cordoba2026` |
| `MOODLE_ICAL_URL` | *(la URL completa de export_execute.php)* |
| `VAPID_SUBJECT` | `mailto:calendario.daw@ejemplo.com` |
| `VAPID_PUBLIC_KEY` | *(BG5g...)* |
| `VAPID_PRIVATE_KEY` | *(tEcN...)* |

### B3. Desplegar

Click en **Create Web Service**. Render tardará 3-5 minutos en desplegar.

Al acabar verás una URL tipo: `https://calendario-daw-backend.onrender.com`

**Cópiala**, la usaremos para el frontend.

---

## FASE C — Crear servicio Frontend en Render

### C1. Nuevo Static Site

1. **New** → **Static Site**
2. Mismo repo (`calendario-daw`)
3. Configura:
   - **Name**: `calendario-daw-frontend`
   - **Root Directory**: `./frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `dist`
   - **Instance type**: Free

### C2. Variables

| KEY | VALUE |
|-----|-------|
| `VITE_API_URL` | `https://calendario-daw-backend.onrender.com` |
| `VITE_SUPABASE_URL` | `https://ninvnzqkpelswmiqnjhp.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(la sb_publishable_...)* |

### C3. Desplegar

Click **Create Static Site**. Espera 2-3 minutos.

Te dará una URL pública tipo `https://calendario-daw-frontend.onrender.com`.

---

## FASE D — Probar

1. Abre la URL del frontend en tu navegador.
2. Entra con `Antonio` + `daw2cordoba2026`.
3. Deberías ver los 7 eventos de Moodle.
4. Comparte la URL con tus 2 compañeros.

---

## ⚠️ Cosas importantes sobre Render Free

**Cold starts**: Los servicios gratis de Render se duermen tras 15 min sin peticiones. La primera petición puede tardar hasta 30 segundos en despertar.

Para mitigarlo, una vez desplegado te podemos poner un cron que cada 10 minutos toque el `/api/health` para mantenerlo despierto.

---

## FASE E — Compartir con tus amigos

Cuando tu amigo (por ejemplo, Miguel) quiera añadir eventos desde OpenCode:

1. Clona o descarga el repo (o solo la carpeta `scripts/`).
2. Instala Node.js (lo tiene por ser DAW).
3. Edita `scripts/.env` y pon la URL de Render en `API_URL_PROD`.
4. Abre OpenCode en esa carpeta.
5. OpenCode leerá `AGENTS.md` automáticamente y sabrá qué hacer.

Le basta con decirle: *"apunta examen DWES el 15 a las 9, temas JWT"*.
