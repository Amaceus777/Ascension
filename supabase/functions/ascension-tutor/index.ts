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

  const nvidiaApiKey = Deno.env.get("NVIDIA_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!nvidiaApiKey || !supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Falta configurar NVIDIA_API_KEY en los secretos de Supabase." }, 503);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Inicia sesión para usar el tutor." }, 401);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sesión no válida. Vuelve a iniciar sesión." }, 401);

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("multipart/form-data") || req.url.includes("audio=1")) {
    // Accept the legacy mixed-case name while standardizing on MULTILINGUE.
    const parakeetKey = (Deno.env.get("MULTILINGUE") || Deno.env.get("Multilingue") || "").trim();
    const bridgeUrl = (Deno.env.get("RIVA_BRIDGE_URL") || "").trim();
    const bridgeSecret = (Deno.env.get("RIVA_BRIDGE_SECRET") || "").trim();
    const missingSecrets = [
      ...(!parakeetKey ? ["MULTILINGUE"] : []),
      ...(!bridgeUrl ? ["RIVA_BRIDGE_URL"] : []),
      ...(!bridgeSecret ? ["RIVA_BRIDGE_SECRET"] : []),
    ];
    if (missingSecrets.length) {
      console.error("Missing Parakeet configuration:", missingSecrets.join(", "));
      return json({
        error: "Falta configuración de voz en los secretos de Supabase.",
        missing: missingSecrets,
      }, 503);
    }
    let audio: Blob | null = null;
    try {
      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const item = form.get("audio");
        if (item instanceof File) audio = item;
      } else {
        const payload = await req.json();
        if (typeof payload.audioBase64 === "string") {
          const binary = atob(payload.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          audio = new Blob([bytes], { type: "audio/wav" });
        }
      }
    } catch { return json({ error: "No se pudo leer el audio enviado." }, 400); }
    if (!audio) return json({ error: "No se ha recibido ningún archivo de audio." }, 400);
    if (audio.size < 44 || audio.size > 12 * 1024 * 1024) return json({ error: "El audio debe pesar entre 44 bytes y 12 MB." }, 413);
    const forward = new FormData();
    forward.append("audio", audio, "speech.wav");
    try {
      const response = await fetch(bridgeUrl.replace(/\/$/, "") + "/transcribe", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + bridgeSecret,
          "X-NVIDIA-API-Key": parakeetKey,
        },
        body: forward,
        signal: AbortSignal.timeout(90000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Parakeet bridge error", response.status, result?.detail ?? "unknown");
        return json({ error: result?.detail || "No se pudo transcribir el audio." }, response.status >= 400 && response.status < 500 ? response.status : 502);
      }
      if (typeof result.transcript !== "string" || !result.transcript.trim()) {
        return json({ error: "Parakeet no devolvió una transcripción." }, 502);
      }
      return json({ transcript: result.transcript.trim() });
    } catch (error) {
      console.error("Parakeet bridge request failed", error);
      return json({ error: "No se pudo conectar con el servicio de reconocimiento de voz." }, 502);
    }
  }

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
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + nvidiaApiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [{ role: "system", content: system }, ...history],
        max_tokens: 2400,
        temperature: 0.6,
        top_p: 0.95,
        stream: false,
        chat_template_kwargs: { enable_thinking: true },
      }),
    });
    const raw = await response.text();
    let result: Record<string, any> = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { /* handled below */ }
    if (!response.ok) {
      console.error("NVIDIA inference error", response.status, result?.error ?? raw.slice(0, 500));
      return json({
        error: response.status === 401 || response.status === 403
          ? "NVIDIA ha rechazado la clave. Comprueba NVIDIA_API_KEY en los secretos de Supabase."
          : response.status === 429
            ? "NVIDIA ha aplicado un límite temporal. Espera un poco y vuelve a intentarlo."
            : "NVIDIA no pudo completar la respuesta. Comprueba la disponibilidad del modelo y vuelve a intentarlo.",
      }, response.status === 429 ? 429 : 502);
    }
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      console.error("NVIDIA returned no final content", result?.choices?.[0]?.finish_reason);
      return json({ error: "El tutor no devolvió una respuesta final. Prueba con una petición más concreta." }, 502);
    }
    return json({ reply: reply.trim() });
  } catch (error) {
    console.error("Tutor request failed", error);
    return json({ error: "No se pudo conectar con NVIDIA. Comprueba la conexión e inténtalo de nuevo." }, 502);
  }
});
