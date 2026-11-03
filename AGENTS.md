# AGENTS.md

> **Este archivo lo lee OpenCode automáticamente**. Está pensado para que cualquier agente de OpenCode (en el portátil de Antonio o en el de sus amigos) sepa cómo interactuar con el calendario DAW.

## Qué es este proyecto

Calendario compartido de 3 estudiantes de 2º DAW en un IES de Córdoba. Recoge los avisos que los profesores dan en clase (exámenes, entregas, cambios de fecha) y se sincroniza automáticamente con Moodle cada 15 min.

## URL del backend

Está publicado en Render. La URL se guarda en `scripts/.env` como `API_URL_PROD`. El código de sala se llama `SALA_CODIGO` — ambos necesarios en todas las peticiones.

## Cómo añadir un evento al calendario

Ejecuta desde la terminal (PowerShell en Windows, bash en Linux/Mac):

```bash
node scripts/add-event.js \
  --titulo "Examen 2ª evaluación DWES" \
  --modulo dwes \
  --tipo examen \
  --fecha 2026-01-15 \
  --hora 09:00 \
  --descripcion "Temas: APIs REST, JWT, Express"
```

Si es todo el día:
```bash
node scripts/add-event.js --titulo "Vacaciones Navidad" --modulo ipe --fecha 2026-12-24 --todo-el-dia
```

### Módulos válidos
`ipe`, `dwec`, `dwes`, `daw`, `diw`, `en`, `opt`, `proy`

Traducción automática del nombre largo al código:
- "Despliegue" / "Docker" / "contenedores" / "Kubernetes" → `daw`
- "Servidor" / "PHP" / "MySQL" → `dwes`
- "Cliente" / "JavaScript" / "HTML" / "CSS" → `dwec`
- "Diseño" / "Figma" / "accesibilidad" → `diw`
- "Inglés" / "English" → `en`
- "Itinerario" / "empleabilidad" / "salida profesional" → `ipe`
- "Optativa" → `opt`
- "Proyecto" → `proy`

### Tipos válidos
`examen`, `entrega`, `apunte`, `clase`, `reunion`, `otro`

Si el usuario dice "el profe ha dicho que..." sin más contexto, suele ser `apunte`. Si es un trabajo con fecha concreta, `entrega`.

## Pasos recomendados para el agente

Cuando el usuario pida "apunta X", "mete Y en el calendario" o "se ha cambiado la fecha de Z":

1. **Extrae** título, módulo, tipo, fecha, hora y descripción de la frase.
2. **Busca duplicados antes de crear** con `node scripts/search-events.js "<texto>"`. Si ya existe uno parecido, pregunta si lo actualizas o añades otro.
3. **Si falta algún dato obligatorio**, pregunta solo lo necesario (no inventes fechas).
4. **Confirma antes de ejecutar**: muestra qué se va a guardar y pide OK.
5. **Ejecuta** el comando y muestra el resultado (ID incluido para referencias posteriores).
6. **Si la frase incluye una modificación** ("finalmente el examen es el 20 en vez del 15"), busca el evento, muestra el ID, y borra + crea nuevo (o usa PUT al API).

## Otros comandos útiles

```bash
node scripts/list-events.js --dias 14
node scripts/list-events.js --dias 30 --modulo dwes
node scripts/search-events.js "examen DWES"
node scripts/delete-event.js <ID>
node scripts/add-note.js <ID> "El profe ha dicho que entra también..."
node scripts/complete-event.js <ID>              # marca como hecho
node scripts/complete-event.js <ID> false        # desmarca
node scripts/plan-estudio.js                     # carga semanal y sugerencias
```

## Endpoints de la API (si quieres ir más allá de los scripts)

- `GET /api/eventos?sala=X&desde=&hasta=` — listar
- `POST /api/eventos` — crear
- `PUT /api/eventos/:id` — actualizar
- `DELETE /api/eventos/:id` — borrar
- `POST /api/eventos/:id/completar` — toggle completado
- `POST /api/eventos/:id/duplicar` — duplica sumando 1 día
- `POST /api/eventos/:id/notas` — añadir nota
- `GET /api/notas-modulo/:modulo?sala=` — chat del módulo
- `POST /api/notas-modulo/:modulo`
- `GET /api/stats?sala=` — estadísticas
- `GET /api/plan-estudio?sala=` — carga por semana ISO
- `POST /api/sync/now` — fuerza sincronización Moodle
- `POST /api/config/semana-examen` — configurar semana de exámenes
- `GET /api/export/ics?sala=` — calendario iCal para Google/Apple

## Restricciones

- **No borres nunca un evento con origen `moodle`** — volvería en la próxima sincronización. Si hay que "cancelarlo", añade una nota al evento con el texto "cancelado" y crea un evento manual que lo reemplace.
- Si dos personas escriben sobre el mismo aviso, **prioriza la información más reciente** y fusiona.
- No añadas notas sobre compañeros por nombre si son sensibles.
- No inventes fechas ni módulos. Si no está claro, pregunta.
