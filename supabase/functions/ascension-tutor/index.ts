// ASCENSION AI tutor. The function requires Supabase JWT verification (config.toml).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://amaceus777.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const origin = req.headers.get("origin") ?? "";
  if (origin && origin !== "https://amaceus777.github.io") {
    return json({ error: "Origen no autorizado." }, 403);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Falta configurar GEMINI_API_KEY en los secretos de Supabase." }, 503);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Inicia sesión para usar el tutor." }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sesión no válida. Vuelve a iniciar sesión." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Solicitud JSON no válida." }, 400);
  }

  const subject = typeof body.subject === "string" ? body.subject.slice(0, 100) : "Aprendizaje general";
  const mode = ["tutor", "practice", "diagnostic", "review"].includes(String(body.mode))
    ? String(body.mode)
    : "tutor";
  const course = typeof body.course === "string" ? body.course.slice(0, 100) : "sin especificar";
  const level = Number.isFinite(Number(body.level)) ? Math.max(1, Math.min(100, Number(body.level))) : 1;
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const history = rawHistory
    .filter((m) => m && typeof m === "object" &&
      ["user", "assistant"].includes(String((m as Record<string, unknown>).role)) &&
      typeof (m as Record<string, unknown>).content === "string")
    .map((m) => ({
      role: (m as Record<string, unknown>).role === "assistant" ? "model" : "user",
      parts: [{ text: String((m as Record<string, unknown>).content).slice(0, 2500) }],
    }));

  if (!history.length || history[history.length - 1].role !== "user") {
    return json({ error: "Escribe primero tu pregunta o ejercicio." }, 400);
  }

  const modeInstructions: Record<string, string> = {
    tutor: "Explica paso a paso, con ejemplos claros y comprueba la comprensión con una pregunta breve.",
    practice: "Diseña una práctica progresiva. Presenta un ejercicio cada vez y espera la respuesta antes de revelar la solución.",
    diagnostic: "Evalúa el nivel con preguntas progresivas, una por turno. No reveles respuestas antes de que el estudiante responda. Al final ofrece una estimación razonada, no una certificación oficial.",
    review: "Corrige el trabajo del estudiante con precisión. Separa errores, explicación, versión mejorada y un ejercicio corto para consolidar.",
  };

  const systemInstruction = [
    "Eres ASCENSION Tutor, un profesor paciente, exigente y claro para un estudiante de 16 años.",
    "Tu objetivo es que aprenda y pueda aplicar lo aprendido, no darle respuestas para copiar.",
    "Responde en español salvo cuando la práctica de idioma requiera usar el idioma objetivo. En inglés B1 prioriza conversación natural y corrige errores explicando brevemente en español. En japonés y alemán desde cero usa frases cortas, pronunciación aproximada y traducción.",
    "Adapta dificultad y vocabulario al tema, curso y progreso. Contexto: materia/idioma: " + subject + "; etapa declarada: " + course + "; nivel ASCENSION: " + level + ". El nivel ASCENSION es gamificación, no equivale a nivel académico.",
    "Modo actual: " + modeInstructions[mode],
    "Usa recuperación activa, ejemplos concretos, práctica espaciada y feedback específico. No inventes fuentes ni afirmes que una evaluación es oficial.",
    "Si no sabes algo o hay incertidumbre, dilo. No des consejos médicos, legales o financieros como autoridad. Mantén contenido apropiado para un menor.",
    "Sé conciso, estructurado y evita soltar un temario enorme de golpe. Termina normalmente con una sola tarea o pregunta útil.",
  ].join("\n");

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: history,
          generationConfig: { temperature: 0.65, maxOutputTokens: 1200 },
        }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      console.error("Gemini API error", response.status, result?.error?.status);
      return json({
        error: response.status === 429
          ? "Se alcanzó el límite temporal gratuito de la IA. Espera un poco y vuelve a intentarlo."
          : "El proveedor de IA no pudo completar la respuesta. Comprueba la clave y el estado de Gemini.",
      }, response.status === 429 ? 429 : 502);
    }

    const reply = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!reply) return json({ error: "El tutor no devolvió texto. Prueba con una petición más concreta." }, 502);
    return json({ reply });
  } catch (error) {
    console.error("Tutor request failed", error);
    return json({ error: "No se pudo conectar con el servicio de aprendizaje." }, 502);
  }
});
