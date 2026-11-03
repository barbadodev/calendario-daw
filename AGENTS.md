# AGENTS.md

> **Este archivo lo lee OpenCode automáticamente**. Está pensado para que cualquier agente de OpenCode (en el portátil de Antonio o en el de sus amigos) sepa cómo interactuar con el calendario DAW.

## Qué es este proyecto

Es un calendario compartido para 3 estudiantes de 2º DAW del I.E.S. en Córdoba. Los profesores van dando información en clase (fechas de exámenes, entregas, avisos) y se quiere registrar todo rápido sin rellenar formularios web.

## Cómo añadir un evento al calendario

La app tiene un **backend en Render** que expone una API REST. Para añadir un evento, ejecuta desde una terminal (PowerShell en Windows, bash en Linux/Mac):

```bash
node scripts/add-event.js
```

Con los flags:
```bash
node scripts/add-event.js \
  --titulo "Examen 2ª evaluación DWES" \
  --modulo dwes \
  --tipo examen \
  --fecha 2026-01-15 \
  --hora 09:00 \
  --descripcion "Temas: APIs REST, JWT, Express" \
  --autor "Antonio"
```

### Módulos válidos
- `ipe` — IPE
- `dwec` — DWEC
- `dwes` — DWES
- `daw` — DAW
- `diw` — DIW
- `en` — Inglés
- `opt` — Optativa
- `proy` — Proyecto

### Tipos válidos
- `examen` 📝
- `entrega` 📦
- `apunte` 📝
- `clase` 📚
- `reunion` 👥
- `otro` ⭐

## Pasos recomendados para el agente

Cuando el usuario te pida "apunta X en el calendario" o "di al profe Y":

1. **Extrae** de su frase: título, módulo, tipo, fecha, hora (si es todo el día, dilo), descripción.
2. **Si falta algo**, pregunta solo lo necesario (no inventes fechas).
3. **Confirma** con el usuario antes de ejecutar: "¿Metemos Examen de DWES el 15/01 a las 9? Sí/No".
4. **Ejecuta** el comando `add-event.js` desde la terminal.
5. **Informa** del resultado.

Si el usuario menciona el nombre de un módulo en español largo ("Despliegue", "Diseño de Interfaces", "Inglés", "Proyecto"), tradúcelo al ID interno antes de ejecutar el script.

## Otros comandos útiles

Listar eventos próximos:
```bash
node scripts/list-events.js --dias 14
```

Buscar por texto:
```bash
node scripts/search-events.js "examen DWES"
```

Eliminar un evento (por su ID):
```bash
node scripts/delete-event.js <ID-evento>
```

Añadir una nota a un evento existente:
```bash
node scripts/add-note.js <ID-evento> "El profe ha dicho que entra también..."
```

## Configuración

Las variables que usan los scripts están en `backend/.env` (URL de Render + código de sala). Si ejecutas desde el portátil de un amigo, debe copiarse el archivo `.env` desde el repositorio.

## Restricciones

- No borres nunca un evento de Moodle (origen `moodle`) — se resincroniza solo y volvería a aparecer.
- Si dos personas escriben sobre la misma clase/examen, dale prioridad a la información más reciente.
- No añadas notas sobre compañeros por nombre si son sensibles.
