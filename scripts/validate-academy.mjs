import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("index.html", "utf8");
const start = html.indexOf("const LESSONS=");
const end = html.indexOf("let selectedLesson=null;", start);
if (start < 0 || end < 0) throw new Error("No se pudo localizar el catálogo de lecciones.");
const validatorMatch = html.match(/function validateAcademyCatalog\(\)\{[\s\S]*?\n\}/);
if (!validatorMatch) throw new Error("Falta validateAcademyCatalog().");

const source = html.slice(start, end) + "\n" + validatorMatch[0] +
  "\nglobalThis.__academyResult = validateAcademyCatalog();";
const sandbox = { document: { getElementById: () => null }, console };
vm.runInNewContext(source, sandbox);

const result = sandbox.__academyResult;
if (!result || result.errors.length) {
  throw new Error("Catálogo inválido: " + (result?.errors || ["resultado vacío"]).join("; "));
}
if (result.routes < 11 || result.lessons < 44) {
  throw new Error("Catálogo incompleto: " + JSON.stringify(result));
}
for (const marker of [
  "function createPlan()",
  "function renderPlanner()",
  "function confirmVerification()",
  "function requestBossStep",
  "function lessonAdaptation",
  "LESSONS.psychology=",
  "'psychology-6'",
  "function renderLessons()",
  "skill-branch",
  "skill-node-wrap",
  "psychology-note",
  "p.kind==='review'",
  "finishReview=function(id)"
]) {
  if (!html.includes(marker)) throw new Error("Falta flujo requerido: " + marker);
}
const missionCompletion = html.slice(html.lastIndexOf("complete=function(id){"));
if (!missionCompletion.startsWith("complete=function(id){") ||
    !missionCompletion.slice(0, 260).includes("openVerification('mission'")) {
  throw new Error("Las misiones no exigen confirmación y evidencia antes de otorgar XP.");
}
const reviewCompletion = html.slice(html.lastIndexOf("finishReview=function(id){"),
  html.lastIndexOf("complete=function(id){"));
if (!reviewCompletion.includes("openVerification('review'")) {
  throw new Error("Los repasos no exigen confirmación.");
}
console.log("Academia validada: " + result.routes + " rutas, " + result.lessons +
  " lecciones, tres preguntas corregibles por lección.");
console.log("Agenda, confirmación con evidencia, hitos verificados y adaptación detectados.");
