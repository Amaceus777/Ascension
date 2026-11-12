// ASCENSION AI tutor. Supabase verifies the user's JWT before this function runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://amaceus777.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== "https://amaceus777.github.io") return json({ error: "Origen no autorizado." }, 403);

  const hfToken = Deno.env.get("HF_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!hfToken || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Falta configurar HF_TOKEN en los secretos de Supabase." }, 503);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Inicia sesión para usar el tutor." }, 401);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sesión no válida. Vuelve a iniciar sesión." }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Solicitud JSON no válida." }, 400); }
  const subject = typeof body.subject === "string" ? body.subject.slice(0, 100) : "Aprendizaje general";
  const mode = ["tutor", "practice", "diagnostic", "review"].includes(String(body.mode)) ? String(body.mode) : "tutor";
  const course = typeof body.course === "string" ? body.course.slice(0, 100) : "sin especificar";
  const level = Number.isFinite(Number(body.level)) ? Math.max(1, Math.min(100, Number(body.level))) : 1;
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const history = rawHistory
    .filter((m) => m && typeof m === "object" &&
      ["user", "assistant"].includes(String((m as Record<string, unknown>).role)) &&
      typeof (m as Record<string, unknown>).content === "string")
    .map((m) => ({
      role: (m as Record<string, unknown>).role === "assistant" ? "assistant" : "user",
      content: String((m as Record<string, unknown>).content).slice(0, 2500),
    }));
  if (!history.length || history[history.length - 1].role !== "user") return json({ error: "Escribe primero tu pregunta o ejercicio." }, 400);

  const modes: Record<string, string> = {
    tutor: "Explica paso a paso con ejemplos y comprueba la comprensión con una pregunta breve.",
    practice: "Diseña una práctica progresiva. Presenta un ejercicio cada vez y espera la respuesta antes de revelar la solución.",
    diagnostic: "Evalúa el nivel con preguntas progresivas, una por turno. No reveles respuestas antes de que el estudiante responda. Al final ofrece una estimación razonada, no una certificación oficial.",
    review: "Corrige el trabajo con precisión. Separa errores, explicación, versión mejorada y un ejercicio corto para consolidar.",
  };
  const system = [
    "Eres ASCENSION Tutor, un profesor paciente, exigente y claro para un estudiante de 16 años.",
    "Tu objetivo es que aprenda y pueda aplicar lo aprendido, no darle respuestas para copiar.",
    "Responde en español salvo cuando la práctica de idioma requiera usar el idioma objetivo. En inglés B1 prioriza conversación natural y corrige errores explicando brevemente en español. En japonés y alemán desde cero usa frases cortas, pronunciación aproximada y traducción.",
    "Materia o idioma: " + subject + ". Etapa declarada: " + course + ". Nivel ASCENSION: " + level + ". El nivel ASCENSION es gamificación, no equivale a nivel académico.",
    "Modo: " + modes[mode],
    "Usa recuperación activa, ejemplos concretos, práctica espaciada y feedback específico. No inventes fuentes ni afirmes que una evaluación es oficial.",
    "Si no sabes algo o hay incertidumbre, dilo. Mantén contenido apropiado para adolescentes.",
    "Sé conciso, estructurado y evita soltar un temario enorme de golpe. Termina normalmente con una sola tarea o pregunta útil.",
  ].join("\n");

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + hfToken, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "Qwen/Qwen3-32B:cheapest",
        messages: [{ role: "system", content: system }, ...history],
        max_tokens: 900,
        temperature: 0.6,
        stream: false,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("Inference provider error", response.status, result?.error);
      return json({
        error: response.status === 402 || response.status === 429
          ? "Se agotó el crédito gratuito o se alcanzó el límite temporal. No se hará ningún cargo automático; revisa tu saldo en Hugging Face."
          : "El proveedor no pudo completar la respuesta. Comprueba el token y la disponibilidad del modelo.",
      }, response.status === 429 ? 429 : 502);
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return json({ error: "El tutor no devolvió texto. Prueba con una petición más concreta." }, 502);
    return json({ reply: reply.trim() });
  } catch (error) {
    console.error("Tutor request failed", error);
    return json({ error: "No se pudo conectar con el servicio de aprendizaje." }, 502);
  }
});
