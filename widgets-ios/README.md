# Widgets iOS para Calendario DAW

Los 3 widgets usan la app gratuita **Scriptable** (App Store). Sin Xcode, sin pagar Apple Developer, sin TestFlight.

## Índice

| Widget | Archivo | Uso |
|--------|---------|-----|
| Próximo evento | `proximo-evento.js` | Pantalla de bloqueo + home |
| Semana | `semana.js` | Pantalla de inicio (medium/large) |
| Pendientes | `pendientes.js` | Checklists al tocar |
| (aux) Marcar completado | `marcar-completado.js` | Se ejecuta solo desde el widget |
| Atajo Apuntar evento | `atajo-apuntar-evento.md` | Se crea desde app Atajos de iOS |

## Instalación de los 3 widgets (5 minutos)

### 1. Instalar Scriptable
Busca **Scriptable** en la App Store (gratis). Descárgala en tu iPhone.

### 2. Añadir cada script

Repite estos pasos por cada archivo `.js` de esta carpeta (menos `marcar-completado.js` que se hace aparte):

1. Abre Scriptable → pestaña **Scripts**
2. Click en el botón **+** (arriba a la derecha) → **Nuevo script en blanco**
3. Pulsa en el nombre del script y renómbralo igual que el archivo (ej: `proximo-evento`)
4. Pulsa el icono `<>` o "Abrir editor"
5. Borra el contenido, pega TODO el contenido del archivo `.js`
6. Click en el botón de compartir (arriba) → **Guardado automático**

**IMPORTANTE** — el nombre del script debe coincidir EXACTAMENTE con lo que el código busca, porque el widget 3 hace referencia a `marcar-completado`.

### 3. Instalar "marcar-completado" (auxiliar)

Igual que los otros dos, pero este no se usa como widget, solo como script que se dispara al tocar.

En Scriptable → **+** → **Nuevo script en blanco** → nombre `marcar-completado` → pega contenido del archivo.

### 4. Añadir el widget a la pantalla

**Pantalla de inicio:**
1. Mantén pulsado en un hueco libre hasta que tiemblen los iconos
2. Click **+** arriba a la izquierda → busca **Scriptable**
3. Elige tamaño (pequeño / medio / grande) → **Añadir widget**
4. Mantén pulsado sobre el widget vacío → **Editar widget**
5. En **Script**, selecciona el nombre (`proximo-evento`, `semana` o `pendientes`)
6. Listo.

**Pantalla de bloqueo (iOS 16+):**
1. Ajustes → Pantalla de bloqueo → Añadir nueva pantalla de bloqueo
2. Pulsa sobre el área de widgets → **Añadir widget** → Scriptable
3. Selecciona `proximo-evento` → aparece contador circular o texto compacto
4. Configura el estilo dentro del editor de bloqueo

### 5. Probar

Los widgets se refrescan automáticamente cada **15 minutos** (configurable en el código con `widget.refreshInterval`).

Para forzar refresco: mantén pulsado el widget → **Actualizar Script** (o tira hacia abajo desde la pantalla de bloqueo).

---

## Personalización rápida

En los tres scripts `.js`, la primera sección dice:

```js
// ================================================
// CONFIGURACIÓN — cambia si hace falta
// ================================================
const API_URL = 'https://calendario-daw.onrender.com';
const SALA = 'daw2cordoba2026';
const COLOR_FONDO = Color.hex('#0f172a');
// ================================================
```

Si cambias el código de sala en Render, actualízalo aquí.

---

## Troubleshooting

| Problema | Arreglo |
|----------|---------|
| "Error al cargar" / widgets vacíos | El backend en Render está dormido. Abre `https://calendario-daw.onrender.com/api/health` en Safari → espera 30 s → refresco widget |
| No se puede instalar en pantalla de bloqueo | Tu iOS es < 16.1. Actualiza |
| Tap en un evento pendiente no lo marca | Asegúrate de que el script se llama EXACTAMENTE `marcar-completado` y que iOS tiene permiso de abrir Scriptable desde widgets |
| El contador dice siempre "HOY" | La zona horaria de iOS está mal → Ajustes → General → Fecha y hora → Automática |

## Qué no puede hacer Scriptable (vs. app nativa)

- No puede recibir **push notifications** desde fuera (solo redirecciones al tocar)
- No puede sincronizar eventos con el calendario nativo de iOS (eso hay que hacerlo desde Safari: "Añadir a Apple Calendar" con el iCal feed)
- No aparece en Spotlight Search
- Los widgets se refrescan cada 15 min máximo, no "instantáneamente"
