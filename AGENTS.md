# AGENTS.md — Directrices Universales del Proyecto (OpenCode, Antigravity y Codex)

> **Regla de oro multi-agente:** Este archivo es la **fuente de verdad unificada** compartida para cualquier agente de IA (**OpenCode**, **Antigravity** y **Codex**) que opere en el proyecto *Calendario DAW*.
> Todos los agentes deben leer, acatar y respetar estas directrices sin excepción para evitar conflictos y desincronizaciones entre sesiones.

---

## 1. Convivencia Multi-Agente y Matriz de Auto-Derivación

### Licencias, Coste (USD) y Presupuesto de Tokens:
* **Antigravity Pro (Estudiante):**
  * **Coste marginal:** **$0.00 USD** (incluido en tarifa plana de estudiante).
  * **Capacidad de tokens:** Ventana masiva (1M+ tokens).
  * **Estrategia económica:** Absorbe el 100% de las tareas de alto volumen de tokens (volcados de código, refactorizaciones, búsquedas amplias) sin coste adicional en USD.
* **OpenCode (Go):**
  * **Coste marginal:** **Gasta saldo/créditos en USD** o consumo de cuota mensual Go por tokens de entrada/salida.
  * **Capacidad de tokens:** Óptima para respuestas directas y scripts acotados.
  * **Estrategia económica:** Evitar enviarle contextos gigantes o árboles de archivos innecesarios para no quemar saldo en USD.
* **Codex (Free):**
  * **Coste marginal:** **$0.00 USD**, pero con **cupo de tokens mensual/diario muy limitado**.
  * **Capacidad de tokens:** Ventana reducida.
  * **Estrategia económica:** No gastar su porcentaje de uso gratuito en tareas multi-archivo (se agotaría el 100% del cupo en pocas peticiones). Reservar para autocompletado y funciones breves (< 1.000 tokens).

### REGLA OBLIGATORIA DE AUTO-DERIVACIÓN (Consciencia de Coste y Tokens):
Cuando recibas una petición del usuario, evalúa el volumen estimado de tokens y el impacto en USD/cuota:

1. **Si eres Codex (Free):**
   * Si la tarea supera los ~1.000 tokens de contexto o involucra múltiples archivos:
     > *⚠️ Alerta de Tokens y Cuota:* Esta tarea requiere leer/escribir un alto volumen de tokens y consumiría un porcentaje crítico de tu cuota gratuita mensual de Codex. Como tienes **Antigravity Pro (Estudiante) con coste $0.00 USD y contexto ilimitado**, te recomiendo derivarla a él para preservar tu cupo de Codex.
2. **Si eres OpenCode (Go):**
   * Si el usuario te pide una tarea masiva de refactorización o diseño UI que requiera miles de tokens continuos:
     > *💡 Alerta de Consumo USD:* Esta operación generaría un consumo elevado de tokens en tu plan OpenCode Go (con coste en saldo USD). Para optimizar tu gasto, es preferible ejecutar esta tarea en **Antigravity Pro (Estudiante)**, donde el coste por token es $0.00.
3. **Si eres Antigravity (Pro):**
   * Si la petición es un comando puntual de consola o un script rápido en clase:
     > *💡 Tip de agilidad:* Esta consulta apenas consume tokens (~200 tokens). **OpenCode Go** en tu terminal te dará respuesta inmediata sin necesidad de levantar el entorno completo.

### Reglas de Git en Concurrencia
1. **Ramas independientes:** Cada tarea o agente debe trabajar en su propia rama de Git (ej. `antonio/<funcionalidad>` o `jonas/<funcionalidad>`). Nunca trabajar concurrentemente varios agentes en la rama `main` sin pull/merge previo.
2. **Worktrees para sesiones simultáneas:** Si dos agentes operan a la vez en el mismo equipo, deben utilizar carpetas de worktree separadas (consultar `GUIA_PARALELO.md`).
3. **Respeto a cambios no commiteados:** Antes de comenzar una tarea, comprobar `git status`. Si hay cambios locales sin confirmar de otra sesión, advertir al usuario antes de sobrescribir nada.

---

## 2. Qué es este proyecto

Calendario colaborativo y accesible de 3 estudiantes de 2º DAW en un IES de Córdoba.
Recoge avisos de clase (exámenes, entregas, tareas, apuntes) y se sincroniza automáticamente con el calendario de Moodle cada 15 minutos mediante `node-ical`.

### Arquitectura Técnica
* **Monorepo desacoplado:**
  * `/backend`: API REST pura en Node.js (ES Modules, `"type": "module"`) con Express y cliente Supabase.
  * `/frontend`: SPA en React 18 + Vite + Tailwind CSS v4 + PWA con Service Worker nativo.
  * `/scripts`: Herramientas CLI de automatización para terminal y agentes.
  * `/supabase`: Esquemas SQL y migraciones de PostgreSQL.
  * `/widgets-ios`: Scripts para widgets en Scriptable (iOS).
  * `/docs`: Documentación técnica y guías de despliegue en Render.

---

## 3. Protocolo Obligatorio para Cualquier Tarea (Todos los Agentes)

Cualquier agente (OpenCode, Antigravity, Codex) debe seguir estrictamente este protocolo antes, durante y después de escribir código:

1. **Plan de Acción y Lista de Archivos Previo:**
   * Mostrar siempre un plan de pasos claro y la lista explícita de archivos a crear o modificar **antes** de aplicar cualquier cambio en código.
2. **Código Completo y 100% Funcional:**
   * Prohibido dejar funciones ficticias (mocks o stubs), código a medias o comentarios evasivos tipo `// TODO: implementar después`. Todo cambio debe estar completamente desarrollado.
3. **Verificación Post-Cambio:**
   * Tras cada cambio, ejecutar desde la terminal el comando de validación relevante para confirmar que no se han generado regresiones:
     * Frontend: `cd frontend && npm run build` (garantiza que Vite compila, resuelve imports y no hay errores de sintaxis JSX o CSS).
     * Backend: `node --check backend/server.js` y `node --check backend/src/<archivo-modificado>.js`.
4. **Respeto a la Inmutabilidad de Moodle:**
   * **NUNCA borrar de la base de datos un evento con origen `moodle`** (se recrearía en el siguiente ciclo de sincronización). Para anularlo, añadir una nota con el texto "cancelado" o registrar un evento manual de reemplazo.

5. **Subida Obligatoria a GitHub (commit y push):**
   * Tras cada cambio verificado con éxito, realizar **obligatoriamente** el git commit descriptivo y el git push a GitHub para que los despliegues automáticos en producción (Render) y el repositorio queden inmediatamente sincronizados sin retrasos ni desajustes.
6. **Aviso Sonoro de Tarea Terminada:**
   * Al finalizar satisfactoriamente cada tarea, emitir siempre el aviso acústico de finalización (notificación estilo OpenCode):
     `powershell -Command "(New-Object Media.SoundPlayer 'C:\Windows\Media\Windows Notify Messaging.wav').PlaySync()"`

---

## 4. Archivos Críticos y Rutas Protegidas (PROHIBIDO Modificar sin Permiso Previo)

Los siguientes archivos y directorios son de alta sensibilidad. Ningún agente debe modificarlos, recrearlos o eliminarlos sin la autorización expresa del usuario:

* **Credenciales y Variables de Entorno Privadas:**
  * `backend/.env` (claves de Supabase, API keys, credenciales JWT/secretos)
  * `frontend/.env` (variables públicas de entorno)
  * `vapid-keys.txt` (claves criptográficas de Web Push)
* **Infraestructura de Base de Datos:**
  * `supabase/schema.sql`
  * `supabase/migrations*.sql` (modificar migraciones pasadas rompe la consistencia del estado en Supabase)
* **Despliegue e Infraestructura:**
  * `render.yaml` (configuración del despliegue productivo en Render)
* **Service Worker PWA:**
  * `frontend/public/sw.js` (gestor crítico de notificaciones Push en segundo plano y caché PWA)
* **Control de Dependencias:**
  * `backend/package-lock.json` y `frontend/package-lock.json` (no modificar manualmente)

---

## 5. Comandos Exactos del Entorno

### Servidores de Desarrollo
* **Backend:**
  ```powershell
  cd backend
  npm run dev          # Ejecuta node --watch server.js en puerto 3001
  ```
* **Frontend:**
  ```powershell
  cd frontend
  npm run dev          # Inicia Vite dev server (HMR rápido)
  ```

### Compilación y Validación Estática
* **Frontend Build (test de integración y sintaxis):**
  ```powershell
  cd frontend
  npm run build
  ```
* **Backend Comprobación de Sintaxis:**
  ```powershell
  node --check backend/server.js
  ```

### CLI y Operativa de Eventos (Desde la Raíz)
* **Listar eventos próximos:**
  ```powershell
  node scripts/list-events.js --dias 14
  node scripts/list-events.js --dias 30 --modulo dwes
  ```
* **Buscar eventos:**
  ```powershell
  node scripts/search-events.js "examen DWES"
  ```
* **Añadir evento:**
  ```powershell
  node scripts/add-event.js --titulo "Examen Tema 3" --modulo dwes --tipo examen --fecha 2026-11-20 --hora 09:00 --descripcion "Temas APIs REST"
  ```
  *(Si es todo el día: `--todo-el-dia`)*
* **Eliminar evento:**
  ```powershell
  node scripts/delete-event.js <ID>
  ```
* **Añadir nota o completar:**
  ```powershell
  node scripts/add-note.js <ID> "Texto de la nota"
  node scripts/complete-event.js <ID>
  node scripts/complete-event.js <ID> false    # desmarcar
  ```
* **Plan de estudio:**
  ```powershell
  node scripts/plan-estudio.js
  ```

---

## 6. Módulos y Tipos Válidos del Calendario

### Códigos de Módulos
* `ipe` → Itinerario / empleabilidad / FOL
* `dwec` → Desarrollo Web en Entorno Cliente (JS, CSS, React)
* `dwes` → Desarrollo Web en Entorno Servidor (Node, Express, PHP, DB)
* `daw` → Despliegue de Aplicaciones Web (Docker, Render, CI/CD)
* `diw` → Diseño de Interfaces Web (Figma, accesibilidad, UX)
* `en` → Inglés técnico
* `opt` → Asignatura optativa
* `proy` → Proyecto integrado

### Tipos de Evento
* `examen`, `entrega`, `apunte`, `clase`, `reunion`, `otro`

---

## 7. URL del Backend y Endpoints Principales

Configurados en `scripts/.env` (`API_URL_PROD` y `SALA_CODIGO`):
* `GET /api/health` — Comprobación de estado
* `GET /api/eventos?sala=X&desde=&hasta=` — Listar eventos
* `POST /api/eventos` — Crear evento
* `PUT /api/eventos/:id` — Actualizar evento
* `DELETE /api/eventos/:id` — Eliminar evento (no moodle)
* `POST /api/eventos/:id/completar` — Alternar estado completado
* `POST /api/eventos/:id/notas` — Añadir nota
* `GET /api/notas-modulo/:modulo?sala=` — Tablón de notas por módulo
* `POST /api/sync/now` — Forzar sincronización inmediata con Moodle
* `GET /api/export/ics?sala=` — Exportación iCal para calendarios externos

---

## 8. Recomendación Proactiva de Comandos Slash (Antigravity)

En el entorno de Antigravity (apoyado en el skill `slash-advisor`), la IA debe sugerir proactivamente al usuario los comandos correspondientes cuando detecte la necesidad:
* `/boost`: Para bugs intrincados, problemas de sincronización con Moodle o arquitectura compleja.
* `/plan`: Para nuevas funcionalidades o refactorizaciones amplias antes de escribir código.
* `/grill-me`: Cuando los requisitos del usuario sean ambiguos o tengan múltiples caminos de diseño posibles.
* `/learn`: Tras solucionar problemas complejos o configurar patrones nuevos para persistirlos.
* `/compact`: Únicamente tras sesiones muy largas o saturación visible de contexto en memoria.

