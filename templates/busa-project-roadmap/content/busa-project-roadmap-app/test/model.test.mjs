import test from "node:test";
import assert from "node:assert/strict";
import {
  date,
  weeks,
  dependencyIssues,
  validateDates,
} from "../app/js/model.js";
const row = (id, start, end, dependencies = []) => ({
  id,
  fields: { "start-date": start, "end-date": end, "depends-on": dependencies },
});
test("ISO weeks retain the correct year across New Year", () => {
  const values = weeks("2026-12-28", 3);
  assert.equal(values[0].label, "W53 · 2026");
  assert.equal(values[1].label, "W01 · 2027");
  assert.equal(values[1].quarter, "Q1 2027");
});
test("conflict proposal preserves duration and starts after its predecessor", () => {
  const issues = dependencyIssues([
    row("a", "2026-12-01", "2026-12-11"),
    row("b", "2026-12-07", "2026-12-09", ["a"]),
  ]);
  assert.deepEqual(
    issues.map((i) => [i.kind, i.start, i.end]),
    [["conflict", "2026-12-12", "2026-12-14"]],
  );
});
test("missing dates, unloaded dependencies and cycles are not treated as safe", () => {
  assert.equal(
    dependencyIssues([row("a", null, null, ["missing"])])[0].kind,
    "unloaded",
  );
  assert.equal(
    dependencyIssues([row("a", null, null), row("b", null, null, ["a"])])[0]
      .kind,
    "undated",
  );
  assert.ok(
    dependencyIssues([
      row("a", null, null, ["b"]),
      row("b", null, null, ["a"]),
    ]).every((i) => i.kind === "cycle"),
  );
});
test("invalid dates and reversed intervals are rejected", () => {
  assert.equal(date("2026-02-30"), null);
  assert.equal(date("2026-99-99"), null);
  assert.throws(() => validateDates("2026-12-20", "2026-12-01"));
  assert.doesNotThrow(() => validateDates("", ""));
});

 test("incomplete dependency schedules never produce suggested dates", () => {
  for (const rows of [
    [row("a", "2026-12-01", "2026-12-11"), row("b", "2026-12-07", "2026-12-09", ["a", "unloaded"])],
    [row("a", "2026-12-01", "2026-12-11"), row("x", null, null), row("b", "2026-12-07", "2026-12-09", ["a", "x"])],
    [row("a", "2026-12-01", "2026-12-11"), row("b", "2026-12-07", null, ["a"])],
    [row("a", "2026-12-01", "2026-12-11"), row("b", null, null, ["a"])],
  ]) {
    const issues = dependencyIssues(rows);
    assert.ok(issues.length);
    assert.ok(issues.every((issue) => !issue.start && !issue.end));
  }
});
