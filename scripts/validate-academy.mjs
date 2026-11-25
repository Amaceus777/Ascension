import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("const LESSONS=");
const end = html.indexOf("let selectedLesson=null;", start);
if (start < 0 || end < 0) throw new Error("No se pudo localizar el catálogo base.");
const validatorMatch = html.match(/function validateAcademyCatalog\(\)\{[\s\S]*?\n\}/);
if (!validatorMatch) throw new Error("Falta validateAcademyCatalog().");
const expansion = fs.readFileSync("scripts/academy-expansion.js", "utf8");
const source = html.slice(start, end) + "\n" + expansion + "\n" + validatorMatch[0] +
  "\nglobalThis.__lessons = LESSONS; globalThis.__checks = LESSON_CHECKS; globalThis.__academyResult = validateAcademyCatalog(); globalThis.__readingCount = LESSONS.interpretation.units.filter(unit => !!unit.reading).length;";
const sandbox = { document: { getElementById: () => null }, console };
vm.runInNewContext(source, sandbox);

const requiredMaterials = [
  ["philosophy","Estética: belleza, oscuridad y lo sublime"], ["english","Resolver malentendidos y pedir aclaraciones"],
  ["music","Escucha activa y capas sonoras"], ["music","Pulso, compás y groove"],
  ["music","Estructura y dinámica metalcore"], ["music","Análisis musical de una canción"],
  ["music","Voz, interpretación y contraste limpio-scream"],
  ["marketing","Investigación de cliente y buyer persona"],
  ["reasoning","Evaluar fuentes y estudios"], ["commerce","Inventario, rotación y control de existencias"]
];
for (const [route,title] of requiredMaterials) {
  const unit = sandbox.__lessons?.[route]?.units.find(item => item.title === title);
  if (!unit?.reading || !unit.readingTitle) throw new Error("Falta material integrado en " + route + " · " + title);
}
const externalRequirements = [
  /de tu biblioteca/i, /una obra que conozcas/i, /una página de manga/i,
  /libro, manga o anime/i, /usa noesis para localizar/i, /usa el micrófono y revisa/i,
  /elige un personaje de una obra/i, /dos canciones/i, /tema que conozcas/i,
  /busca (?:una|un|el|la) .{0,45}(?:canción|vídeo|obra|libro|estudio|página|manga|artículo)/i,
  /graba (?:un|una|tu|la|el)/i, /descarga (?:un|una|el|la)/i, /imprime (?:un|una|el|la)/i,
  /instala (?:una|un|el|la)/i, /abre (?:spotify|youtube|google|una aplicación)/i,
  /consulta (?:un estudio|una fuente|un artículo|una publicación)/i,
  /usa (?:el|un) (?:micrófono|instrumento|software|programa|editor externo)/i
];
for (const [route,data] of Object.entries(sandbox.__lessons || {})) {
  for (const unit of data.units || []) {
    for (const pattern of externalRequirements) {
      if (pattern.test(unit.task || "")) throw new Error("La tarea exige un recurso externo: " + route + " · " + unit.title);
    }
  }
}

const result = sandbox.__academyResult;
if (!result || result.errors.length) throw new Error("Catálogo inválido: " + (result?.errors || ["resultado vacío"]).join("; "));
if (!html.includes("const optionSets=checks.map(q=>Array.isArray(q.o)?q.o.map(normalize).sort().join('|'):'')") || !html.includes("new Set(checks.map(q=>normalize(q.q)))")) throw new Error("Falta la comprobación de enunciados y conjuntos de respuestas únicos.");
if (result.routes !== 15 || result.lessons !== 117) throw new Error("Catálogo incompleto: " + JSON.stringify(result));
if (sandbox.__readingCount !== 10) throw new Error("Faltan los diez textos originales integrados de interpretación.");

const repairIndex = sandbox.__lessons.english.units.findIndex(unit => unit.title === "Resolver malentendidos y pedir aclaraciones");
const repair = sandbox.__lessons.english.units[repairIndex];
const repairChecks = sandbox.__checks["english-" + repairIndex] || [];
if (repairIndex < 0 || !repair?.branch?.includes("Interacción") || !repair?.subbranch || repairChecks.length !== 3) throw new Error("La nueva lección de speaking no está integrada en el árbol o carece de test.");
if (repairChecks.some(q => /CASO PRÁCTICO|COMPROBACIÓN CRÍTICA/.test(q.q))) throw new Error("El test de speaking usa preguntas plantilla en vez de preguntas específicas.");
if (new Set(repairChecks.map(q => q.q)).size !== 3 || new Set(repairChecks.map(q => q.o.map(x => x.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()).sort().join("|"))).size !== 3) throw new Error("El test de speaking reutiliza enunciados u opciones.");
if (!repair.reading?.includes("No necesitas") || /busca (?:una|un|el|la)|descarga|imprime|instala|graba/i.test(repair.task)) throw new Error("La nueva lección no es autosuficiente.");
for (const [route,data] of Object.entries(sandbox.__lessons)) for (const unit of data.units) for (const field of ["objective","concepts","steps"]) if (!String(unit[field] || "").trim()) throw new Error("Falta " + field + " explícito en " + route + " · " + unit.title);


for (const marker of ["Puntuación objetiva del test", "Autoevaluación declarada", "comentarios cualitativos", "attempt?.correct", "APROBADO · UMBRAL DE PROGRESO ALCANZADO", "COMPLETADA"]) {
  if (!html.includes(marker)) throw new Error("Falta transparencia de evaluación o adaptación objetiva: " + marker);
}
for (const marker of ["const KEY='ascension-v2'", "function saveLocal()", "function cloudSave()", "function startVoice()", "function processVoiceRecording()", "data.transcript", "s.lessonAttempts[id]=attempt", "s.lessonHistory[id].push", "s.lessonMastery[id]=true"]) {
  if (!html.includes(marker)) throw new Error("Se ha alterado o perdido una integración de guardado/micrófono: " + marker);
}
const sw = fs.readFileSync("sw.js", "utf8");
if (!sw.includes("ascension-shell-v20") || !sw.includes("scripts/academy-expansion.js")) throw new Error("El service worker no incluye la nueva versión y el catálogo.");

for (const marker of [
  "function createPlan()", "function renderPlanner()", "function confirmVerification()",
  "function requestBossStep", "function lessonAdaptation", "function renderLessons()",
  "function focusTree", "function focusBranch", "function focusSubbranch", "getAcademySubbranches",
  "const branches=getAcademyBranches(course,data)", "anterior de esta subrama",
  "tree-root-node", "tree-branch-node", "tree-leaf", "cat.innerHTML=tree", "previous=sub.items[leafIndex-1]", "renderMissionBoard", "research-box", "tutorLessonContext", "materialTitle:unit.readingTitle", "materialText:unit.reading", "prepareTutorAction", "unit.reading",
  "searchNoesisForLesson", "renderResearchResults", "buildLessonChallenge", "buildLessonQuiz", "lessonHistory", "BIBLIOTECA INTEGRADA", "scripts/academy-expansion.js"
]) if (!html.includes(marker)) throw new Error("Falta flujo requerido: " + marker);
for (const marker of ["CASO PRÁCTICO", "COMPROBACIÓN CRÍTICA", '"Elegir una acción que cumpla el objetivo: "+objective', '"Explicar el procedimiento y justificar cada paso: "+steps']) {
  if (!expansion.includes(marker)) throw new Error("Falta variedad real de respuestas: " + marker);
}
for (const marker of ["La casa que aprendió a esperar", "No necesitas buscar otro poema", "Pulso de ceniza", "Texto original creado para ASCENSION"]) if (!expansion.includes(marker)) throw new Error("Falta material integrado: " + marker);
const tutor = fs.readFileSync("supabase/functions/ascension-tutor/index.ts", "utf8");
for (const marker of ["const lessonContext", "materialTitle: clip(rawContext.materialTitle", "materialText: clip(rawContext.materialText", "materialSource: clip(rawContext.materialSource", "Contexto de la lección activa", "no inventes autores", "no diagnostiques al estudiante", "Distingue resultados, correlación y causalidad"]) {
  if (!tutor.includes(marker)) throw new Error("Falta capacidad del tutor: " + marker);
}
for (const marker of ['route("philosophy"', 'route("music"', 'route("writing"', 'route("interpretation"', 'LESSONS.psychology=']) {
  if (!expansion.includes(marker) && !html.includes(marker)) throw new Error("Falta ruta: " + marker);
}
const missionCompletion = html.slice(html.lastIndexOf("complete=function(id){"));
if (!missionCompletion.startsWith("complete=function(id){") || !missionCompletion.slice(0,260).includes("openVerification('mission'")) throw new Error("Las misiones no exigen confirmación.");
const reviewCompletion = html.slice(html.lastIndexOf("finishReview=function(id){"), html.lastIndexOf("complete=function(id){"));
if (!reviewCompletion.includes("openVerification('review'")) throw new Error("Los repasos no exigen confirmación.");
console.log("Academia validada: " + result.routes + " rutas, " + result.lessons + " lecciones, tres preguntas por lección y diez textos originales.");
console.log("Árbol multinivel, agenda, verificación, desafíos rotativos y biblioteca NOESIS integrada detectados.");
