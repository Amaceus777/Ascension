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
  "\nglobalThis.__lessons = LESSONS; globalThis.__academyResult = validateAcademyCatalog(); globalThis.__readingCount = LESSONS.interpretation.units.filter(unit => !!unit.reading).length;";
const sandbox = { document: { getElementById: () => null }, console };
vm.runInNewContext(source, sandbox);

const externalRequirements = [
  /de tu biblioteca/i, /una obra que conozcas/i, /una página de manga/i,
  /libro, manga o anime/i, /usa noesis para localizar/i, /usa el micrófono y revisa/i,
  /elige un personaje de una obra/i, /dos canciones/i, /tema que conozcas/i
];
for (const [route, data] of Object.entries(sandbox.LESSONS || {})) {
  for (const unit of data.units || []) {
    for (const pattern of externalRequirements) {
      if (pattern.test(unit.task || "")) throw new Error("La tarea exige un recurso externo: " + route + " · " + unit.title);
    }
  }
}


const requiredMaterials = [
  ["philosophy","Estética: belleza, oscuridad y lo sublime"],
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
  /elige un personaje de una obra/i, /dos canciones/i, /tema que conozcas/i
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
if (!html.includes("new Set(checks.map(q=>JSON.stringify(q.o)))")) throw new Error("Falta la comprobación de conjuntos de respuestas únicos.");
if (result.routes !== 15 || result.lessons !== 111) throw new Error("Catálogo incompleto: " + JSON.stringify(result));
if (sandbox.__readingCount !== 10) throw new Error("Faltan los diez textos originales integrados de interpretación.");
for (const marker of [
  "function createPlan()", "function renderPlanner()", "function confirmVerification()",
  "function requestBossStep", "function lessonAdaptation", "function renderLessons()",
  "function focusTree", "function focusBranch", "function focusSubbranch", "getAcademySubbranches",
  "const branches=getAcademyBranches(course,data)", "anterior de esta subrama",
  "tree-root-node", "tree-branch-node", "tree-leaf", "cat.innerHTML=tree", "previous=sub.items[leafIndex-1]", "renderMissionBoard", "research-box", "tutorLessonContext", "prepareTutorAction", "unit.reading",
  "searchNoesisForLesson", "renderResearchResults", "buildLessonChallenge", "buildLessonQuiz", "lessonHistory", "BIBLIOTECA INTEGRADA", "scripts/academy-expansion.js"
]) if (!html.includes(marker)) throw new Error("Falta flujo requerido: " + marker);
for (const marker of ["La casa que aprendió a esperar", "No necesitas buscar otro poema", "Pulso de ceniza", "Texto original creado para ASCENSION"]) if (!expansion.includes(marker)) throw new Error("Falta material integrado: " + marker);
const tutor = fs.readFileSync("supabase/functions/ascension-tutor/index.ts", "utf8");
for (const marker of ["const lessonContext", "Contexto de la lección activa", "no inventes autores", "no diagnostiques al estudiante", "Distingue resultados, correlación y causalidad"]) {
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
