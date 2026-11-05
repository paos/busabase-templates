export const DAY = 86400000;
export const date = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
  !Number.isNaN(+new Date(value + "T00:00:00Z")) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
    ? new Date(value + "T00:00:00Z")
    : null;
export const iso = (value) => new Date(value).toISOString().slice(0, 10);
export const addDays = (value, days) => iso(+date(value) + days * DAY);
export const refs = (value) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map((v) => (typeof v === "string" ? v : v.recordId || v.id))
    .filter(Boolean);
export function validateDates(start, end) {
  if ((start && !date(start)) || (end && !date(end)))
    throw new Error("Enter valid calendar dates.");
  if (start && end && start > end)
    throw new Error("Finish must be on or after start.");
}
export function weekLabel(value) {
  const d = date(value);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear(),
    week = Math.ceil(((d - Date.UTC(year, 0, 1)) / DAY + 1) / 7);
  return `W${String(week).padStart(2, "0")} · ${year}`;
}
export function weeks(start, count = 12) {
  const d = date(start);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: count }, (_, i) => {
    const day = iso(+d + i * 7 * DAY);
    return {
      day,
      label: weekLabel(day),
      quarter: `Q${Math.floor(date(day).getUTCMonth() / 3) + 1} ${date(day).getUTCFullYear()}`,
    };
  });
}
export function dependencyIssues(rows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const issues = [];
  const memo = new Map(),
    visiting = new Set();
  const cyclic = (id) => {
    if (visiting.has(id)) return true;
    if (memo.has(id)) return memo.get(id);
    visiting.add(id);
    const result = refs(byId.get(id)?.fields["depends-on"]).some(cyclic);
    visiting.delete(id);
    memo.set(id, result);
    return result;
  };
  for (const row of rows) {
    const f = row.fields,
      predecessors = refs(f["depends-on"]);
    const unseen = predecessors.filter((id) => !byId.has(id));
    if (unseen.length)
      issues.push({
        row,
        kind: "unloaded",
        message:
          "A dependency is outside the loaded records. Load more before changing dates.",
      });
    if (cyclic(row.id)) {
      issues.push({
        row,
        kind: "cycle",
        message:
          "Dependencies form a loop. Edit dependencies before proposing dates.",
      });
      continue;
    }
    const known = predecessors.map((id) => byId.get(id)).filter(Boolean);
    const missingFinish = known.some((p) => !date(p.fields["end-date"]));
    const completeInterval = date(f["start-date"]) && date(f["end-date"]) && f["end-date"] >= f["start-date"];
    if (predecessors.length && !completeInterval)
      issues.push({ row, kind: "undated", message: "Set a valid start and finish before requesting suggested dates." });
    if (missingFinish)
      issues.push({
        row,
        kind: "undated",
        message: "A dependency has no finish date.",
      });
    const finish = known
      .map((p) => p.fields["end-date"])
      .filter((v) => date(v))
      .sort()
      .at(-1);
    if (finish && date(f["start-date"]) && finish >= f["start-date"]) {
      const start = addDays(finish, 1),
        duration =
          date(f["end-date"]) && date(f["start-date"])
            ? Math.max(0, (date(f["end-date"]) - date(f["start-date"])) / DAY)
            : 0;
      issues.push({
        row,
        kind: "conflict",
        message: `Starts before its dependency has finished (${finish}).`,
        ...(!unseen.length && !missingFinish && completeInterval
          ? { start, end: addDays(start, duration) }
          : {}),
      });
    }
  }
  return issues;
}
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function rescheduleInterval(start, end, days, edge = "move") {
  validateDates(start, end);
  if (!date(start) || !date(end)) throw new Error("Set a start and finish first.");
  const delta = Math.round(days);
  if (edge === "start") return { start: [addDays(start, delta), end].sort()[0], end };
  if (edge === "end") return { start, end: [start, addDays(end, delta)].sort().at(-1) };
  return { start: addDays(start, delta), end: addDays(end, delta) };
}
export function scheduleReview(rows, row, fields) {
  const candidate = { ...row, fields: { ...row.fields, ...fields } };
  const updated = rows.map((item) => item.id === row.id ? candidate : item);
  const problems = dependencyIssues(updated).filter((issue) =>
    issue.row.id === row.id || refs(issue.row.fields["depends-on"]).includes(row.id));
  const dependencies = refs(candidate.fields["depends-on"]);
  const predecessors = dependencies.map((id) => rows.find((item) => item.id === id));
  const canAlign = dependencies.length > 0 && predecessors.every((item) =>
    item && date(item.fields["end-date"])) &&
    !problems.some((issue) => issue.kind === "cycle");
  const latest = canAlign ? predecessors.map((item) => item.fields["end-date"]).sort().at(-1) : null;
  const start = fields["start-date"], end = fields["end-date"];
  const align = latest && date(start) && date(end) && start <= end
    ? { start: addDays(latest, 1), end: addDays(latest, 1 + (date(end) - date(start)) / DAY) }
    : null;
  return { problems, align };
}
