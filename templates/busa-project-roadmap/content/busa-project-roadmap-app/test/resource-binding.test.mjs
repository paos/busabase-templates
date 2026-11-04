import test from "node:test";
import assert from "node:assert/strict";
import { bindInstalledResources } from "../app/js/resource-binding.js";
test("installation discovery sees all stamped folders and rejects duplicates", async () => {
  const folder = { id: "deep-folder", type: "folder", metadata: { appId: "test", resourceKey: "app-root" } };
  let folders = [folder];
  const client = { nodes: {
    list: async (input) => { assert.deepEqual(input, { types: ["folder"] }); return folders; },
    get: async () => ({ node: { slug: "deep-folder" }, children: [] }),
  } };
  const config = { appId: "test", folder: {}, bases: [] };
  assert.equal((await bindInstalledResources(client, config)).folder.nodeId, "deep-folder");
  folders = [folder, { ...folder, id: "other-deep-folder" }];
  await assert.rejects(bindInstalledResources(client, config), /Expected one owned installation, found 2/);
});
