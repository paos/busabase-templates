import test from "node:test";
import assert from "node:assert/strict";
import { createLiveProvider } from "../app/js/providers/live.js";
import { appConfig } from "../app/js/config.js";
function fixture() {
  const metadata = (resourceKey) => ({
    appId: appConfig.appId,
    resourceKey,
    schemaVersion: 1,
  });
  const root = {
    id: "test-folder",
    slug: "test-install",
    type: "folder",
    metadata: metadata("app-root"),
  };
  const children = appConfig.bases.map((b) => ({
    id: "test-node-" + b.key,
    baseId: "test-base-" + b.key,
    slug: "test-" + b.key,
    type: "base",
    metadata: metadata(b.key),
  }));
  const reads = [],
    writes = [];
  const client = {
    nodes: {
      async list() {
        return [root];
      },
      async get() {
        return { node: root, children };
      },
    },
    records: {
      async list(input) {
        reads.push(input);
        return {
          records: [
            { id: "test-record", headCommit: { payload: { title: "Test" } } },
          ],
          nextCursor: "next-page",
        };
      },
      async changeRequest(input) {
        writes.push(input);
        return { id: "test-proposal", status: "in_review", operations: [] };
      },
    },
    bases: {
      async createChangeRequest(input) {
        writes.push(input);
        return { id: "test-proposal", status: "in_review", operations: [] };
      },
    },
  };
  return { client, reads, writes, provider: createLiveProvider(client) };
}
test("reads one scoped page and preserves the continuation cursor", async () => {
  const f = fixture();
  const page = await f.provider.page("projects");
  assert.equal(f.reads.length, 1);
  assert.equal(f.reads[0].limit, 50);
  assert.equal(f.reads[0].baseId, "test-base-projects");
  assert.equal(page.nextCursor, "next-page");
  assert.equal(page.records[0].fields.title, "Test");
  await f.provider.page("projects", page.nextCursor);
  assert.equal(f.reads.length, 2);
  assert.equal(f.reads[1].cursor, "next-page");
});
test("normal writes follow permissions while schedule proposals require review", async () => {
  const f = fixture();
  const row = { id: "test-record", headCommitId: "test-head" };
  const result = await f.provider.save("milestones", row, { done: true });
  assert.equal(result.status, "queued");
  assert.equal("autoMerge" in f.writes[0], false);
  assert.equal(f.writes[0].baseCommitId, "test-head");
  await f.provider.propose(row, {
    "start-date": "2026-12-12",
    "end-date": "2026-12-14",
    "depends-on": ["predecessor"],
  });
  assert.equal(f.writes[1].autoMerge, false);
  assert.deepEqual(f.writes[1].fields["depends-on"], ["predecessor"]);
  assert.equal(f.writes[1].baseCommitId, "test-head");
});
test("authentication failures never turn into sample data", async () => {
  const f = fixture();
  f.client.records.list = async () => {
    throw new Error("Unauthorized");
  };
  await assert.rejects(() => f.provider.page("projects"), /Unauthorized/);
});
