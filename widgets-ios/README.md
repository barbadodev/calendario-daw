# Widgets iOS para Calendario DAW

Los widgets usan la app gratuita **Scriptable** (App Store). Sin Xcode, sin pagar Apple Developer, sin TestFlight.

## Índice

| Widget | Archivo | Uso |
|--------|---------|-----|
| Próximo evento | `proximo-evento.js` | Pantalla de inicio (small) |
| Próximo evento compacto | `proximo-bloqueo.js` | Pantalla de bloqueo iOS 16+ |
| Semana | `semana.js` | Pantalla de inicio (medium) |
| Pendientes | `pendientes.js` | Marca un evento al tocar (medium) |
| (aux) Marcar completado | `marcar-completado.js` | Se ejecuta solo desde el widget |
| Atajo Apuntar evento | `atajo-apuntar-evento.md` | Se crea desde app Atajos de iOS |

## Instalación de los widgets (5 minutos)

### 1. Instalar Scriptable
Busca **Scriptable** en la App Store (gratis). Descárgala en tu iPhone.

### 2. Añadir cada script

Repite estos pasos por cada archivo `.js` de esta carpeta:

1. Abre Scriptable → pestaña **Scripts**
2. Click en el botón **+** (arriba a la derecha) → **Nuevo script en blanco**
3. Pulsa en el nombre del script y renómbralo igual que el archivo (ej: `proximo-evento`)
4. Pulsa el icono `<>` o "Abrir editor"
5. Borra el contenido, pega TODO el contenido del archivo `.js`
6. Cierra el editor → **Guardado automático**

**IMPORTANTE** — el nombre del script debe coincidir EXACTAMENTE, porque el widget `pendientes` referencia internamente a `marcar-completado`.

### 3. Añadir los widgets a la pantalla

**Pantalla de inicio:**
1. Mantén pulsado en un hueco libre hasta que tiemblen los iconos
2. Click **+** arriba a la izquierda → busca **Scriptable**
3. Elige tamaño (pequeño / medio / grande) → **Añadir widget**
4. Mantén pulsado sobre el widget vacío → **Editar widget**
5. En **Script**, selecciona el nombre (`proximo-evento`, `semana`, `pendientes`)
6. Listo.

**Pantalla de bloqueo (iOS 16+):**
1. Ajustes → **Pantalla de bloqueo** → **Personalizar** en tu pantalla actual (o crear nueva)
2. Pulsa el área de widgets encima/debajo del reloj → **Añadir widget**
3. Busca **Scriptable** → elige tamaño inline → selecciona `proximo-bloqueo`
4. Listo.

### 4. Probar

Los widgets se refrescan automáticamente cada **15 minutos** (máximo que permite iOS).

Para forzar refresco: mantén pulsado el widget → **Actualizar Script**.

---

## Configuración

En los cinco scripts `.js`, el principio de cada uno dice:

```js
const API_URL = 'https://calendario-daw.onrender.com';
const SALA = 'daw2cordoba2026';
```

Si rotáis el código de sala en Render, hay que actualizarlo en los **5 scripts** de iPhone de cada usuario.

---

## Troubleshooting

| Problema | Arreglo |
|----------|---------|
| Widgets vacíos o "Error al cargar" | Backend dormido. Abre `https://calendario-daw.onrender.com/api/health` en Safari, espera 30 s, y fuerza refresco del widget |
| No se puede instalar en pantalla de bloqueo | Tu iOS es < 16.1. Actualiza |
| Tap en pendientes no marca como hecho | El script auxiliar debe llamarse EXACTAMENTE `marcar-completado` (guion, no espacio) |
| El contador dice siempre "HOY" | iOS en otra zona horaria → Ajustes → General → Fecha y hora → Automática |

## Qué no puede hacer Scriptable (vs. app nativa)

- No puede recibir **push notifications** externas — pero iOS sí muestra el widget actualizado, que es casi lo mismo
- No sincroniza con el calendario nativo de iOS desde el widget. Para eso: desde Safari → Ajustes → Calendarios → Añadir cuenta → **Suscripción a calendario** → pega la URL del iCal export
- Los widgets se refrescan cada 15 min máximo (limitación iOS)

## Bonus: iCal en Apple Calendar

Si quieres que los eventos aparezcan en la app **Calendario nativa de iOS** (y así tenerlos en Notificaciones Centrales, Spotlight y Siri):

```
https://calendario-daw.onrender.com/api/export/ics?sala=daw2cordoba2026
```

Pégala en: Ajustes → Calendarios → Cuentas → Añadir cuenta → **Calendario de suscripción**. Es la misma suscripción que ofrece Moodle, pero ya filtrada y con colores por módulo.
