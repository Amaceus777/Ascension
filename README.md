# ASCENSION · PWA mobile

Aplicación web progresiva en español, diseñada primero para móvil y con estética RPG oscura.

## Funciones disponibles
- Perfil editable: alias, curso/etapa, minutos diarios y nivel de energía.
- Misiones diarias adaptadas al tiempo y energía disponibles.
- XP, niveles, rangos, rachas y atributos por área.
- Proyectos jefe con hitos y recompensa única al completar.
- Academia inicial de inglés B1, japonés y alemán.
- Prueba básica de inglés y repasos espaciados a 1, 3 y 7 días.
- Árbol de habilidades, historial y estadísticas de progreso.
- Exportación e importación del progreso en JSON.
- PWA con manifest, icono y caché offline básica.

## Publicar con GitHub Pages
1. Entra en **Settings** del repositorio.
2. Abre **Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Selecciona la rama **main** y la carpeta **/(root)**. Guarda.
5. Espera a que GitHub Pages publique el sitio. La URL será `https://amaceus777.github.io/Ascension/`.

## Instalar en el móvil
Abre la URL publicada con HTTPS:
- Android: Chrome → menú → Instalar aplicación / Añadir a pantalla de inicio.
- iPhone: Safari → Compartir → Añadir a pantalla de inicio.

## Privacidad y límites actuales
- No requiere suscripción, API ni backend.
- El progreso se guarda localmente en el navegador. No se sincroniza entre dispositivos.
- No hay login, IA conectada ni notificaciones push/email reales.
- Exporta una copia JSON antes de cambiar de dispositivo o borrar los datos del navegador.
- La adaptación de carga es una heurística basada en tiempo y energía, no una IA.
- Descansar no resta XP.


## Conexión de Supabase (pendiente de credenciales)

La interfaz ya incluye acceso por enlace mágico de correo y sincronización del progreso mediante Supabase.

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En **SQL Editor**, ejecuta el contenido de `supabase/schema.sql`.
3. En **Project Settings → API**, copia el **Project URL** y la **Publishable key** (o la clave heredada `anon`).
4. En **Authentication → URL Configuration**, añade la URL publicada de ASCENSION a **Redirect URLs**: `https://amaceus777.github.io/Ascension/**`.
5. Introduce esos dos valores en las constantes `SUPABASE_URL` y `SUPABASE_ANON_KEY` de `index.html` y publica el commit.

**No uses nunca la clave `service_role` ni una secret key en el navegador.** La tabla aplica RLS para que cada cuenta solo pueda leer y modificar su propio progreso. La conexión no estará activa hasta completar estos pasos.
