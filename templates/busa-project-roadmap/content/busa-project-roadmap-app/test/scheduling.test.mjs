import test from "node:test";
import assert from "node:assert/strict";
import { rescheduleInterval, scheduleReview } from "../app/js/model.js";
const row = (id, start, end, dependencies = []) => ({ id, fields: { "start-date": start, "end-date": end, "depends-on": dependencies } });
test("moving keeps duration across month/year boundaries; resizing never reverses dates", () => {
  assert.deepEqual(rescheduleInterval("2026-12-28", "2027-01-03", 7), { start: "2027-01-04", end: "2027-01-10" });
  assert.deepEqual(rescheduleInterval("2026-12-28", "2027-01-03", 20, "start"), { start: "2027-01-03", end: "2027-01-03" });
  assert.deepEqual(rescheduleInterval("2026-12-28", "2027-01-03", -20, "end"), { start: "2026-12-28", end: "2026-12-28" });
});
test("review flags downstream conflicts without mutating dependent records", () => {
  const rows = [row("a","2026-12-01","2026-12-03"), row("b","2026-12-04","2026-12-06",["a"])];
  const before = structuredClone(rows);
  const review = scheduleReview(rows, rows[0], {"start-date":"2026-12-02","end-date":"2026-12-05","depends-on":[]});
  assert.equal(review.problems[0].row.id, "b");
  assert.equal(review.problems[0].kind, "conflict");
  assert.deepEqual(rows, before);
});
test("alignment preserves duration and waits for every dependency to have a known finish", () => {
  const rows = [row("a","2026-12-01","2026-12-03"), row("b","2026-12-02","2026-12-06",["a"])];
  assert.deepEqual(scheduleReview(rows, rows[1], rows[1].fields).align, {start:"2026-12-04", end:"2026-12-08"});
  assert.equal(scheduleReview(rows, rows[1], {...rows[1].fields,"depends-on":["a","unloaded"]}).align, null);
  assert.ok(scheduleReview(rows, rows[0], {...rows[0].fields,"depends-on":["b"]}).problems.some(i=>i.kind==="cycle"));
});
