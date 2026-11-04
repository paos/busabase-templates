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
