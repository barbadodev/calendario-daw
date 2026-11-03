// ================================================
// Atajo (Shortcuts) de iOS: "Apuntar evento"
// ================================================
// No es un archivo ejecutable: se crea manualmente
// desde la app Atajos. Aquí tienes los pasos exactos.
// ================================================

# Crear el Atajo "Apuntar evento" en iOS

Es un Atajo (Shortcuts) nativo de iOS que te pregunta los datos y
manda un POST directo a la API del calendario. No requiere Scriptable
ni Node.js. Funciona desde Spotlight, Siri, o un botón de widget.

## Cómo crearlo (6 pasos)

1. **Abre la app "Atajos"** (Shortcuts) en el iPhone
2. Pulsa el botón **+** arriba a la derecha para crear uno nuevo
3. Arriba, pulsa en el nombre del atajo → **Renombrar** → `Apuntar evento`
4. Pulsa el icono de color bajo el nombre → **Añadir a pantalla de inicio**

5. **Añade las acciones** en este orden (botón "Añadir acción" abajo):

### Acción 1 · "Pedir" (Ask for Input)
- Pregunta: `Título del evento`
- Respuesta: Texto

### Acción 2 · "Elegir de la lista" (Choose from List)
- Muestra: `IPE, DWEC, DWES, DAW, DIW, Inglés, Optativa, Proyecto`
- Asigna a variable `modulo_elegido`

### Acción 3 · "Elegir de la lista" (Choose from List)
- Muestra: `examen, entrega, apunte, clase, reunion, otro`
- Asigna a variable `tipo_elegido`

### Acción 4 · "Obtener fecha" (Get Date)
- Modo: Seleccionar fecha
- Asigna a variable `fecha_elegida`

### Acción 5 · "Combinar texto" (Combine Text)
Formato: `{variable modulo_elegido}`
- Pulsa "Mostrar más" → **Convertir a minúsculas**
- Renombrar variable → `modulo_id`

### Acción 6 · "Reemplazar texto" (Replace Text)
En `modulo_id`:
- Reemplazar `inglés` → `en`
- Reemplazar `optativa` → `opt`
- Reemplazar `proyecto` → `proy`
- (IPE, DWEC, DWES, DAW, DIW se quedan igual)

### Acción 7 · "Formatear fecha" (Format Date)
- Fecha: `{fecha_elegida}`
- Formato: ISO 8601
- Se guarda como `fecha_iso`

### Acción 8 · "URL" (URL)
Pega literalmente (una sola línea, sin saltos):
```
https://calendario-daw.onrender.com/api/eventos
```

### Acción 9 · "Pedir contenido" (Ask for Input) — opcional
- Pregunta: `Notas (opcional, deja vacío si no hay)`
- Respuesta: Texto largo
- Renombrar variable a `descripcion`

### Acción 10 · "Cuerpo de solicitud" (Request Body)
- Tipo: JSON
- Contenido JSON (pega esto tal cual, sustituyendo placeholders):

```json
{
  "sala": "daw2cordoba2026",
  "evento": {
    "titulo": "{variable pregunta_titulo}",
    "modulo_id": "{modulo_id}",
    "tipo_id": "{tipo_elegido}",
    "fecha_inicio": "{fecha_iso}",
    "descripcion": "{descripcion}",
    "todo_el_dia": false
  }
}
```

### Acción 11 · "Obtener contents de URL" (Get Contents of URL)
- URL: la acción 8
- Método: POST
- Headers: `Content-Type: application/json`
- Cuerpo: la acción 10

### Acción 12 · "Mostrar" (Show Result)
- Texto: `✅ Guardado en el calendario`

## Cómo invocarlo

- Desde Spotlight: escribe "Apuntar evento"
- Desde Siri: "Oye Siri, apunta un evento en el calendario"
- Como **widget** en pantalla de inicio: Ajustes → Widget → Atajos → elige el que hiciste

## Probarlo

Tócalo, rellena los 4 pasos, y debería aparecer "Guardado en el calendario".

Si falla, revisa:
- ¿El backend está despierto? → abre https://calendario-daw.onrender.com/api/health
- ¿El JSON tiene comas mal puestas?
- ¿Has hecho las conversiones de inglés/optativa/proyecto al ID?
