import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const appRoot = new URL("../app/js/", import.meta.url);
const activities = [
  ["a1", "Call alpha", "call", "2026-01-01"],
  ["a2", "Email alpha", "email", "2026-01-02"],
  ["a3", "Meeting alpha", "meeting", "2026-01-03"],
  ["a4", "Note alpha", "note", "2026-01-04"],
  ["a5", "Call beta", "call", "2026-01-05"],
  ["a6", "Call alpha again", "call", "2026-01-06"],
  ["a7", "Call alpha newest", "call", "2026-01-07"],
].map(([id, subject, type, date]) => ({ id, baseId: "activities-base", fields: {
  "activity-subject": subject, "activity-type": type, "activity-date": date,
} }));
async function providerFixture({ viewSort = "desc", viewFilters = [] } = {}) {
  const bases = ["activities", "companies", "deals"].map((key) => ({
    key, baseId: `${key}-base`, readLimit: 2,
    fields: [{ slug: key === "activities" ? "activity-subject" : "name" }],
    views: key === "activities" ? [{ key: "activity-timeline", viewId: "" }] : [],
  }));
  const config = {
    schema: { folder: { nodeId: "folder" }, bases },
    permissions: {
      read_procedures: ["records.listPaged", "records.listPage", "records.search", "records.count", "bases.listViews", "changeRequests.listPaged"],
      change_request_procedures: [],
    },
  };
  const reads = [];
  const client = {
    records: {
      list: async ({ baseId, cursor, limit }) => {
        reads.push({ method: "list", baseId });
        const rows = baseId === "activities-base" ? activities : [];
        const offset = Number(cursor || 0);
        return { records: rows.slice(offset, offset + limit), nextCursor: offset + limit < rows.length ? String(offset + limit) : null };
      },
      search: async ({ valueText, limit }) => {
        reads.push({ method: "search" });
        return activities.filter((row) => row.fields["activity-subject"] === valueText).slice(0, limit);
      },
      count: async () => ({ total: 0 }),
      listPage: async (input) => {
        reads.push({ method: "listPage", ...input });
        assert.equal(input.viewId, "timeline-view");
        let rows = [...activities];
        for (const filter of input.filters || []) {
          rows = rows.filter((row) => filter.operator === "contains"
            ? String(row.fields[filter.fieldSlug]).toLowerCase().includes(filter.value.toLowerCase())
            : row.fields[filter.fieldSlug] === filter.value);
        }
        rows.sort((a, b) => b.fields["activity-date"].localeCompare(a.fields["activity-date"]) || a.id.localeCompare(b.id));
        const totalPages = Math.ceil(rows.length / input.pageSize);
        return { records: rows.slice((input.page - 1) * input.pageSize, input.page * input.pageSize), page: input.page, totalPages, total: rows.length, pageSize: input.pageSize };
      },
    },
    bases: { listViews: async () => {
      reads.push({ method: "bases.listViews" });
      return [{ id: "timeline-view", slug: "activity-timeline", config: { filters: viewFilters, sorts: [{ fieldSlug: "activity-date", direction: viewSort }] } }];
    } },
    changeRequests: { list: async () => ({ changeRequests: [], nextCursor: null }) },
  };
  const context = vm.createContext({ URL, Map, Set, console });
  const stubs = {
    "../busabase-client.js": { createRuntimeClient: () => client, resolveRuntimeResources: async () => bases },
    "../config.js": { appConfig: config },
    "../../vendor/busabase-sdk.js": { createAirAppRecords: (value) => ({ readPage: (input) => value.records.list(input) }), isAirAppWriteQueued: () => false },
  };
  const cache = new Map();
  async function load(url) {
    if (cache.has(url.href)) return cache.get(url.href);
    const module = new vm.SourceTextModule(await readFile(url, "utf8"), { context, identifier: url.href });
    cache.set(url.href, module);
    await module.link(async (specifier, parent) => {
      if (stubs[specifier]) {
        const values = stubs[specifier];
        return new vm.SyntheticModule(Object.keys(values), function () {
          for (const [key, value] of Object.entries(values)) this.setExport(key, value);
        }, { context });
      }
      return load(new URL(specifier, parent.identifier));
    });
    return module;
  }
  const module = await load(new URL("providers/busabase-provider.js", appRoot));
  await module.evaluate();
  return { provider: module.namespace.busabaseProvider, reads };
}

const ids = (records) => Array.from(records, (record) => record.id);

for (const value of ["call", "email", "meeting", "note"]) {
  test(`Activity type ${value} filters before paging and stays selected on Load more`, async () => {
    const { provider, reads } = await providerFixture();
    await provider.getState();
    const first = await provider.queryBase("activities", { filter: { fieldSlug: "activity-type", value } });
    const records = [...first.records];
    let cursor = first.nextCursor;
    while (cursor) {
      const page = await provider.loadMore("activities", cursor);
      records.push(...page.records);
      cursor = page.nextCursor;
    }
    const expected = activities.filter((row) => row.fields["activity-type"] === value).toReversed();
    assert.deepEqual(ids(records), ids(expected));
    assert.equal(new Set(ids(records)).size, expected.length);
    assert.equal(reads.filter((read) => read.method === "list" && read.baseId === "activities-base").length, 0);
    assert.equal(reads.filter((read) => read.method === "bases.listViews").length, 1);
    assert.ok(reads.filter((read) => read.method === "listPage").every((read) => read.pageSize === 2));
  });
}

test("Activities combine subject prefix and type across pages; clearing restores the timeline", async () => {
  const { provider, reads } = await providerFixture();
  const state = await provider.getState();
  assert.deepEqual(ids(state.records.filter((record) => record.baseKey === "activities")), ["a7", "a6"]);
  const first = await provider.queryBase("activities", { query: "  Call al  ", filter: { fieldSlug: "activity-type", value: "call" } });
  assert.deepEqual(ids(first.records), ["a7", "a6"]);
  const next = await provider.loadMore("activities", first.nextCursor);
  assert.deepEqual(ids(next.records), ["a1"]);
  assert.equal(next.nextCursor, null);
  const empty = await provider.queryBase("activities", { query: "missing", filter: { fieldSlug: "activity-type", value: "call" } });
  assert.deepEqual(ids(empty.records), []);
  assert.equal(empty.nextCursor, null);
  const reset = await provider.queryBase("activities");
  assert.deepEqual(ids(reset.records), ["a7", "a6"]);
  const resetNext = await provider.loadMore("activities", reset.nextCursor);
  assert.deepEqual(ids(resetNext.records), ["a5", "a4"]);
  assert.equal(reads.some((read) => read.method === "search"), false);
});

for (const options of [{ viewSort: "asc" }, { viewFilters: [{ fieldSlug: "activity-type", operator: "equals", value: "call" }] }]) {
  test(`Activities rejects a view that silently changes timeline membership/order ${JSON.stringify(options)}`, async () => {
    const { provider, reads } = await providerFixture(options);
    await assert.rejects(provider.getState(), /SCHEMA_INCOMPLETE/);
    assert.equal(reads.some((read) => read.method === "listPage"), false);
  });
}

test("Activities exposes Load more for filtered pages and hides it after the last page", async () => {
  const source = await readFile(new URL("app.js", appRoot), "utf8");
  const render = source.slice(source.indexOf("function renderList()"), source.indexOf("\nconst fieldValueHtml"));
  const elements = Object.fromEntries(["recordTable", "loadMore", "recordHead", "recordList"].map((id) => [id, { dataset: {}, disabled: false }]));
  const state = { filtered: { nextCursor: "next-filtered-page" } };
  const context = vm.createContext({
    TABLES: { activities: [{ label: "Subject" }] }, state,
    activeBaseKey: () => "activities", listRecords: () => [], narrowed: () => true,
    filteredMatches: () => true, byId: (id) => elements[id],
    setText: () => {}, escapeHtml: String, messages: { noMatches: "No matches" },
  });
  vm.runInContext(`${render}\nrenderList();`, context);
  assert.equal(elements.loadMore.hidden, false);
  state.filtered.nextCursor = null;
  vm.runInContext("renderList()", context);
  assert.equal(elements.loadMore.hidden, true);
});
