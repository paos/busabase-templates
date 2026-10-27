import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const appRoot = new URL("../app/js/", import.meta.url);
const contacts = [
  ["c6", "Zoe", "inactive"],
  ["c1", "Alice", "active"],
  ["c3", "Bob", "active"],
  ["c2", "alice", "active"],
  ["c4", "Charlie", "active"],
  ["c5", "Yara", "inactive"],
].map(([id, name, status]) => ({ id, baseId: "contacts-base", fields: { "full-name": name, "contact-status": status } }));
const expectedIds = ["c1", "c2", "c3", "c4", "c5", "c6"];

async function providerFixture({ viewSort = "asc", viewFilters = [] } = {}) {
  const bases = ["contacts", "companies", "deals"].map((key) => ({
    key, baseId: `${key}-base`, readLimit: 2,
    fields: [{ slug: key === "contacts" ? "full-name" : "name" }],
    views: key === "contacts" ? [{ key: "contact-directory", viewId: "" }] : [],
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
        const rows = baseId === "contacts-base" ? contacts : [];
        const offset = Number(cursor || 0);
        return { records: rows.slice(offset, offset + limit), nextCursor: offset + limit < rows.length ? String(offset + limit) : null };
      },
      search: async ({ valueText, limit }) => contacts.filter((row) => row.fields["full-name"].toLowerCase().includes(valueText.toLowerCase())).slice(0, limit),
      count: async () => ({ total: 0 }),
      listPage: async (input) => {
        reads.push({ method: "listPage", ...input });
        assert.equal(input.viewId, "alphabetical-view");
        let rows = expectedIds.map((id) => contacts.find((row) => row.id === id));
        for (const filter of input.filters || []) {
          rows = rows.filter((row) => filter.operator === "contains"
            ? String(row.fields[filter.fieldSlug]).toLowerCase().includes(filter.value.toLowerCase())
            : row.fields[filter.fieldSlug] === filter.value);
        }
        const totalPages = Math.ceil(rows.length / input.pageSize);
        return { records: rows.slice((input.page - 1) * input.pageSize, input.page * input.pageSize), page: input.page, totalPages, total: rows.length, pageSize: input.pageSize };
      },
    },
    bases: { listViews: async () => {
      reads.push({ method: "bases.listViews" });
      return [{ id: "alphabetical-view", slug: "contact-directory", config: { filters: viewFilters, sorts: [{ fieldSlug: "full-name", direction: viewSort }] } }];
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

test("Contacts initial load and later pages are alphabetically ordered before slicing", async () => {
  const { provider, reads } = await providerFixture();
  const state = await provider.getState();
  const records = state.records.filter((record) => record.baseKey === "contacts");
  assert.deepEqual(ids(records), ["c1", "c2"]);
  let cursor = state.pageInfo.contacts.nextCursor;
  while (cursor) {
    const page = await provider.loadMore("contacts", cursor);
    records.push(...page.records);
    cursor = page.nextCursor;
  }
  assert.deepEqual(ids(records), expectedIds);
  assert.equal(new Set(ids(records)).size, contacts.length);
  assert.equal(reads.filter((read) => read.method === "listPage").length, 3);
  assert.equal(reads.filter((read) => read.method === "bases.listViews").length, 1);
  assert.equal(reads.filter((read) => read.method === "list" && read.baseId === "contacts-base").length, 0);
  assert.equal(reads.filter((read) => read.method === "list" && read.baseId !== "contacts-base").length, 2);
});

test("Contacts search and status filter retain alphabetical order across subsequent pages", async () => {
  const { provider } = await providerFixture();
  await provider.getState();
  const first = await provider.queryBase("contacts", { query: "a", filter: { fieldSlug: "contact-status", value: "active" } });
  assert.deepEqual(ids(first.records), ["c1", "c2"]);
  assert.ok(first.nextCursor);
  const second = await provider.loadMore("contacts", first.nextCursor);
  assert.deepEqual(ids(second.records), ["c4"]);
  assert.equal(second.nextCursor, null);
  const empty = await provider.queryBase("contacts", { query: "missing" });
  assert.deepEqual(ids(empty.records), []);
  assert.equal(empty.nextCursor, null);
});

for (const options of [{ viewSort: "desc" }, { viewFilters: [{ fieldSlug: "contact-status", operator: "equals", value: "active" }] }]) {
  test(`Contacts refuses a saved view that would change the directory's ordering or membership ${JSON.stringify(options)}`, async () => {
    const { provider, reads } = await providerFixture(options);
    await assert.rejects(provider.getState(), /SCHEMA_INCOMPLETE/);
    assert.equal(reads.some((read) => read.method === "listPage"), false);
  });
}
