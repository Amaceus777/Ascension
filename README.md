# ASCENSION · PWA mobile

Aplicación web progresiva en español, diseñada primero para móvil y con estética RPG oscura.

## Funciones disponibles
- Perfil editable: alias, curso/etapa, minutos diarios y nivel de energía.
- Misiones diarias adaptadas al tiempo y energía disponibles.
- XP, niveles, rangos, rachas y atributos por área.
- Proyectos jefe con hitos y recompensa única.
- Academia inicial de inglés B1, japonés y alemán.
- Prueba básica de inglés y repasos espaciados a 1, 3 y 7 días.
- Árbol de habilidades, historial y estadísticas.
- Exportación e importación del progreso en JSON.
- PWA instalable con caché offline básica.
- Integración opcional con Supabase: acceso por enlace mágico y sincronización del progreso.

## Publicación
GitHub Pages sirve la aplicación desde:
https://amaceus777.github.io/Ascension/

El despliegue de GitHub Pages se ejecuta automáticamente al actualizar la rama principal.

## Configuración de Supabase
La aplicación utiliza estas variables en `index.html`:
- `SUPABASE_URL`: URL del proyecto.
- `SUPABASE_ANON_KEY`: publishable key o clave heredada `anon`.

En Supabase:
1. Ejecuta `supabase/schema.sql` en SQL Editor.
2. En **Authentication → URL Configuration**, establece como Site URL la URL publicada de ASCENSION.
3. Añade `https://amaceus777.github.io/Ascension/**` a **Redirect URLs**.
4. En **Authentication → Providers → Email**, mantén habilitado el acceso por correo.
5. Si el proyecto requiere confirmación por correo, abre el enlace recibido en el mismo navegador/dispositivo donde se inició el acceso.

La tabla `public.player_progress` tiene RLS habilitado y políticas que limitan lectura/escritura al usuario autenticado propietario de cada fila. Nunca introduzcas una `service_role` ni una secret key en el frontend.

## Probar la sincronización
1. Abre la URL publicada y entra en **Perfil → Cuenta y sincronización**.
2. Solicita el enlace mágico con tu correo y ábrelo.
3. Comprueba que el estado muestre **Conectado**.
4. Completa una misión y comprueba que el estado muestre **Sincronizado**.
5. Abre ASCENSION en otro dispositivo, inicia sesión con la misma cuenta y verifica que recupere el progreso.

## Instalación móvil
- Android: Chrome → menú → Instalar aplicación / Añadir a pantalla de inicio.
- iPhone: Safari → Compartir → Añadir a pantalla de inicio.

## Límites conocidos
- La sincronización requiere que el proyecto Supabase tenga creada la tabla y configuradas las URL de autenticación.
- El tutor IA requiere desplegar `supabase/functions/ascension-tutor` y configurar `HF_TOKEN` como secreto de Supabase. Hugging Face ofrece un crédito mensual gratuito limitado para Inference Providers; al agotarse, el tutor se detiene y no compra créditos automáticamente. Consulta el saldo antes de usarlo.
- No introduzcas contraseñas, datos personales sensibles ni información privada en el tutor. Las solicitudes se envían a un proveedor de inferencia externo.
- Las lecciones actuales son contenido inicial, no un curso completo ni una evaluación certificada.
- La adaptación de carga es una heurística basada en tiempo y energía, no una IA.
- El progreso local permanece disponible aunque cierres sesión. Exporta una copia JSON antes de borrar los datos del navegador.
- Descansar no resta XP.


## Activar el tutor IA
El tutor usa Hugging Face Inference Providers desde una Edge Function protegida. La clave nunca se guarda en el navegador.

1. Crea una cuenta en Hugging Face y genera un token *fine-grained* en https://huggingface.co/settings/tokens con permiso **Make calls to Inference Providers**.
2. En Supabase → **Edge Functions → Secrets**, guarda el token con el nombre exacto `HF_TOKEN`. No lo pegues en GitHub ni en el chat.
3. Despliega la función desde la raíz del repositorio con Supabase CLI:
   ```bash
   supabase login
   supabase link --project-ref wgaqbohzxelcmmtwhfbg
   supabase functions deploy ascension-tutor
   ```
4. Abre ASCENSION, inicia sesión y entra en **Academia → Tutor IA**.

Hugging Face indica que las cuentas gratuitas reciben actualmente 0,10 USD mensuales en créditos de inferencia, sujetos a cambios. El tutor no puede superar ese saldo: al agotarse, se detiene hasta la siguiente recarga mensual. No compres créditos ni actives pagos para esta app. Revisa [precios y créditos](https://huggingface.co/docs/inference-providers/pricing) y [condiciones de Hugging Face](https://huggingface.co/terms-of-service).
