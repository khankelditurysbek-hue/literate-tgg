import { load, save } from "../lib/db";
import { addMissingDemoExamples } from "../lib/demo";
const current = load("demo");
const next = addMissingDemoExamples(current.data);
if (JSON.stringify(next) === JSON.stringify(current.data))
  console.log(
    "DEMO үлгілері бұрыннан бар. Қолданыстағы деректер өзгертілмеді.",
  );
else {
  save("demo", next, current.version);
  console.log(
    "DEMO мысалдары қосылды. Нақты деректер мен бұрынғы DEMO жазбалары сақталды.",
  );
}
