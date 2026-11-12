# ASCENSION · PWA mobile

## Incluido
- Diseño mobile-first con navegación inferior y soporte safe-area.
- Perfil editable: alias, etapa/curso, tiempo diario y energía.
- Misiones adaptadas a disponibilidad y energía.
- XP, niveles, rangos y atributos separados por área.
- Proyectos jefe con hitos y recompensa única al completar.
- Academia inicial de inglés B1, japonés y alemán.
- Pruebas de respuesta y repasos espaciados (1, 3 y 7 días).
- Analíticas semanales, historial, exportación e importación JSON.
- PWA: manifest, icono, service worker y caché offline básica.

## Coste y privacidad
No requiere cuenta, API, backend ni suscripción. Los datos permanecen en el almacenamiento local del navegador. No hay llamadas a servidores ni IA conectada.

## Publicar gratis para instalar desde el móvil
La aplicación necesita HTTPS para instalarse como PWA. Sube el contenido de esta carpeta a un hosting estático gratuito compatible con HTTPS (por ejemplo GitHub Pages, Cloudflare Pages o Netlify). No se incluye ninguna cuenta ni despliegue automático. Una vez publicada, abre la URL en el móvil y usa el menú del navegador para instalarla.

## Importante
- El progreso no se sincroniza entre dispositivos todavía. Exporta un JSON y guárdalo fuera del navegador.
- Las notificaciones push/email no están conectadas; no se muestran como activas.
- La carga adaptativa usa tiempo y energía configurados. Es una primera heurística, no una IA.
- La racha solo cuenta días en los que se registra actividad. Descansar no resta XP.
