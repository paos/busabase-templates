import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { dueFollowups } from "../app/js/followups.js";
import { messages } from "../app/js/messages.js";
import { appConfig } from "../app/js/config.js";
import { localDateKey, buildOverviewModel } from "../app/js/overview.js";

const records = [
  { id: "future", baseKey: "activities", fields: { "activity-subject": "Future", "next-follow-up-date": "2026-10-28" } },
  { id: "today", baseKey: "activities", fields: { "activity-subject": "Today", "next-follow-up-date": "2026-10-27", "activity-type": "call" } },
  { id: "none", baseKey: "activities", fields: { "activity-subject": "No follow-up" } },
  { id: "overdue", baseKey: "activities", fields: { "activity-subject": "Oldest", "next-follow-up-date": "2026-10-20", "activity-type": "email" } },
];

test("due list and overview identify the same records, oldest first", () => {
  const model = buildOverviewModel({ records, now: new Date("2026-10-27T12:00:00"), pageInfo: {}, counts: {}, stages: [] });
  assert.deepEqual(dueFollowups(records, "2026-10-27").map((row) => row.id), ["overdue", "today"]);
  assert.deepEqual(model.dueActivities.map((row) => row.id), ["overdue", "today"]);
  assert.deepEqual(records.map((row) => row.id), ["future", "today", "none", "overdue"]);
});

async function appHarness() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { dataset: {}, addEventListener(type, fn) { this[type] = fn; }, classList: { toggle() {}, contains() { return false; } }, setAttribute() {}, querySelectorAll() { return []; } });
    if (id === "dealForm") elements.get(id).elements = { company: element("dealCompany") };
    return elements.get(id);
  };
  const source = (await readFile(new URL("../app/js/app.js", import.meta.url), "utf8"))
    .replace(/^import .*;\n/gm, "")
    .replace(/renderIcons\(\);\nload\(\);\s*$/, "");
  const window = { location: { hash: "#/overview" }, addEventListener() {}, matchMedia: () => ({ matches: false }) };
  const history = { pushState(data, unused, url) { this.state = data; window.location.hash = url; }, replaceState(data, unused, url) { this.state = data; window.location.hash = url; } };
  const context = vm.createContext({ appConfig, messages, dueFollowups, localDateKey, window, history, URLSearchParams, console,
    document: { getElementById: element, querySelectorAll: () => [], body: { classList: { toggle() {} } } },
    renderIcons() {}, setTimeout() {}, clearTimeout() {},
  });
  vm.runInContext(source + `\nrender = () => {}; runQuery = () => {}; state.payload = { records: [], pageInfo: {}, provider: { now: "2026-10-27T12:00:00" } };`, context);
  context.input = records;
  vm.runInContext("state.payload.records = input", context);
  return { context, elements, window, run: (code) => vm.runInContext(code, context) };
}

test("attention opens only due follow-ups and preserves scope through record links", async () => {
  const app = await appHarness();
  app.elements.get("dueFollowups").click();
  assert.equal(app.window.location.hash, "#/activities?due=1");
  app.run("renderToolbar(); renderList()");
  assert.equal(app.elements.get("viewTitle").textContent, "Follow-ups due");
  assert.equal(app.elements.get("allActivities").hidden, false);
  const markup = app.elements.get("recordList").innerHTML;
  assert.ok(markup.indexOf('data-record="overdue"') < markup.indexOf('data-record="today"'));
  assert.ok(!markup.includes('data-record="future"'));
  assert.ok(!markup.includes('data-record="none"'));
  assert.deepEqual(Array.from(app.run("listRecords().map(row => row.id)")), ["overdue", "today"]);
  assert.equal(app.run('recordUrl("overdue")'), "#/activities?due=1&peek=overdue");
  app.run('navigate(recordUrl("overdue"))');
  assert.equal(app.run("listUrl()"), "#/activities?due=1");
  app.elements.get("allActivities").click();
  assert.equal(app.window.location.hash, "#/activities");
  assert.equal(app.run("listRecords().length"), 4);
});

test("due scope restores from URL and search/type narrow only its loaded records", async () => {
  const app = await appHarness();
  app.run('navigate("#/activities?due=1&q=Today&f=call")');
  assert.deepEqual(Array.from(app.run("listRecords().map(row => row.id)")), ["today"]);
  assert.equal(app.run('routeFromHash("#/directory/companies?due=1").due'), false);
  app.run('navigate("#/activities?due=1&q=Future")');
  assert.equal(app.run("listRecords().length"), 0);
});


test("overview follow-up action opens due queue rather than all activities", async () => {
  const app = await appHarness();
  app.elements.get("overviewPage").click({ target: { closest: (selector) =>
    selector === "[data-overview-target]" ? { dataset: { overviewTarget: "followups" } } : null,
  } });
  assert.equal(app.window.location.hash, "#/activities?due=1");
  assert.deepEqual(Array.from(app.run("listRecords().map(row => row.id)")), ["overdue", "today"]);
});
