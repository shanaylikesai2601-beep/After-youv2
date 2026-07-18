import { strict as assert } from "node:assert";
import { normalizeChosenTool, normalizeReasoningDecision, normalizeSentinel } from "./normalize-reasoning-decision";

const base = { reasoningSummary: "step", whyTool: "because", toolInput: {}, observations: [], confidence: 0.5, nextAction: "continue" };
for (const value of ["null", "None", "", " ", undefined]) {
  assert.equal(normalizeSentinel(value), undefined);
  const result = normalizeReasoningDecision({ ...base, chosenTool: value }) as { chosenTool: unknown };
  assert.equal(result.chosenTool, null);
}
assert.equal((normalizeReasoningDecision({ ...base, chosenTool: "search" }) as { chosenTool: unknown }).chosenTool, "search");
assert.equal(normalizeChosenTool("NULL"), undefined);
assert.equal(normalizeChosenTool(" Search "), "search");
