# Ideas pendientes

Apuntar aquí en cuanto surja, con commit rápido. Cada idea → una rama pequeña.

## En espera de decisión

- [ ] Quitar o dejar los emojis de los avisos push y del iCal (`📝 📦 ⏰`). La interfaz ya usa iconos; esto solo afecta al texto que llega al móvil y a Apple/Google Calendar. (antonio)
- [ ] Decidir si el rojo del cierre inminente debe también vibrar/sonar aparte (ahora es una notificación normal). (—)

## Backend / sincronización

- [ ] Copia de seguridad automática nocturna (export JSON a un bucket o repositorio privado). (—)
- [ ] Caché de eventos en local (IndexedDB) para que la app funcione **sin conexión** viendo lo último descargado. (—)
- [ ] Si el token de Moodle caduca, avisar por push a los tres (ahora solo sale el banner rojo dentro de la app). (—)
- [ ] Detectar cambios de hora en Moodle y avisar con mensaje específico ("el profe movió la Sesión 8 del 8 al 12"). (—)

## Funcionalidad

- [ ] Ficha de examen: temas que entran, material permitido, checklist de repaso. (—)
- [ ] Control de horas de FCT: contador hechas/restantes, empresa, tutor, contacto. (—)
- [ ] Hitos del PROYECTO con entregables y fecha de defensa. (—)
- [ ] Registro de notas por módulo y media ponderada del curso. (—)
- [ ] "Confirmar asistencia" en las reuniones de grupo (👍 voy / ❌ no puedo). (—)
- [ ] Avisos no leídos: badge de cuántas cosas no has visto desde tu última entrada. (—)
- [ ] Búsqueda global en la app (texto + módulo + fecha a la vez). (—)

## Diseño

- [ ] macOS: estados vacíos y de carga a medida (ahora usan los del sistema crema). (jonas)
- [ ] Revisar contraste del amarillo Optativa y el cian Inglés en los 5 estilos. (—)
- [ ] Animaciones sutiles al cambiar de vista (200 ms, respetando `prefers-reduced-motion`). (—)
- [ ] Modo compacto/extendido para la vista de mes en pantallas pequeñas. (—)

## Cosas de la infraestructura

- [ ] Rotar el código de sala si se filtra (Render + `scripts/.env` + suscripciones iCal de los tres).
- [ ] Vigilar que los monitores de UptimeRobot sigan activos (si no, el backend se duerme).
- [ ] Cambiar el nombre de la app instalada ("CalDAW" → "DAW"): hay que quitar y volver a añadir el acceso en iOS.

---

## Hecho recientemente

Tailwind v4 · iconos en vez de emojis · tema claro/oscuro/sistema · 5 estilos conmutables
· alerta de cierre inminente · notificaciones de cambios con confirmación al autor
· anti-dormición · sincronización Moodle con clasificación automática por curso
· copia de seguridad descargable · resumen para WhatsApp
