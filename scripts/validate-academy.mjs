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
  "\nglobalThis.__academyResult = validateAcademyCatalog();";
const sandbox = { document: { getElementById: () => null }, console };
vm.runInNewContext(source, sandbox);
const result = sandbox.__academyResult;
if (!result || result.errors.length) throw new Error("Catálogo inválido: " + (result?.errors || ["resultado vacío"]).join("; "));
if (result.routes !== 15 || result.lessons !== 91) throw new Error("Catálogo incompleto: " + JSON.stringify(result));\nif (sandbox.__readingCount !== 8) throw new Error("Faltan los ocho textos originales de interpretación.");
for (const marker of [
  "function createPlan()", "function renderPlanner()", "function confirmVerification()",
  "function requestBossStep", "function lessonAdaptation", "function renderLessons()",
  "function focusTree", "function focusBranch", "function focusSubbranch", "getAcademySubbranches", "tree-root-node", "tree-branch-node",
  "tree-leaf", "research-box", "unit.reading", "searchNoesisForLesson", "noesisFrame",
  "scripts/academy-expansion.js"
]) if (!html.includes(marker)) throw new Error("Falta flujo requerido: " + marker);
for (const marker of ['route("philosophy"', 'route("music"', 'route("writing"', 'route("interpretation"', 'LESSONS.psychology=']) {
  if (!expansion.includes(marker) && !html.includes(marker)) throw new Error("Falta ruta: " + marker);
}
const missionCompletion = html.slice(html.lastIndexOf("complete=function(id){"));
if (!missionCompletion.startsWith("complete=function(id){") || !missionCompletion.slice(0,260).includes("openVerification('mission'")) throw new Error("Las misiones no exigen confirmación.");
const reviewCompletion = html.slice(html.lastIndexOf("finishReview=function(id){"), html.lastIndexOf("complete=function(id){"));
if (!reviewCompletion.includes("openVerification('review'")) throw new Error("Los repasos no exigen confirmación.");
console.log("Academia validada: " + result.routes + " rutas, " + result.lessons + " lecciones, tres preguntas por lección.");
console.log("Árbol multinivel, agenda, verificación y puente de investigación detectados.");
