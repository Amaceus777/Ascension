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
if (result.routes < 10 || result.lessons < 25) {
  throw new Error("Catálogo incompleto: " + JSON.stringify(result));
}
for (const marker of [
  "function createPlan()",
  "function renderPlanner()",
  "function confirmVerification()",
  "complete=function(id)",
  "function requestBossStep",
  "function lessonAdaptation"
]) {
  if (!html.includes(marker)) throw new Error("Falta flujo requerido: " + marker);
}
console.log("Academia validada: " + result.routes + " rutas, " + result.lessons +
  " lecciones, tres preguntas corregibles por lección.");
console.log("Agenda, confirmación con evidencia, hitos verificados y adaptación detectados.");
