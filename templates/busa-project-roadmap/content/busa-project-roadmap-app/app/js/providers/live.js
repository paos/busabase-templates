import {
  inspectProvisionedResources,
  createAirAppRecords,
  toAirAppWriteOutcome,
} from "../../vendor/busabase-airapp.js";
import { appConfig } from "../config.js";
import { createRuntimeClient } from "../busabase-client.js";
import { bindInstalledResources } from "../resource-binding.js";
export function createLiveProvider(client = createRuntimeClient()) {
  let bases;
  const records = createAirAppRecords(client, { appId: appConfig.appId });
  async function ready() {
    if (bases) return;
    const binding = await bindInstalledResources(client, appConfig);
    const result = await inspectProvisionedResources(client, binding);
    if (
      result.missing.length ||
      result.conflicts?.length ||
      result.repairs?.length
    )
      throw new Error(
        "The installed tables do not match this template. Check the installation.",
      );
    bases = result.bases;
  }
  function base(key) {
    const b = bases.find((b) => b.key === key);
    if (!b) throw new Error("Unknown table.");
    return b;
  }
  return {
    name: "Live workspace",
    async page(key, cursor) {
      await ready();
      return records.readPage({
        baseId: base(key).baseId,
        limit: 50,
        cursor,
        sort: { fieldSlug: "start-date", direction: "asc" },
      });
    },
    async save(key, row, fields, idempotencyKey) {
      await ready();
      return row
        ? records.updateRecord({
            recordId: row.id,
            baseCommitId: row.headCommitId,
            fields,
            message: "Update roadmap",
          })
        : records.createRecord({
            baseId: base(key).baseId,
            fields,
            idempotencyKey,
            message: "Add to roadmap",
          });
    },
    async propose(row, fields) {
      return toAirAppWriteOutcome(
        await client.records.changeRequest({
          recordId: row.id,
          baseCommitId: row.headCommitId,
          operation: "update",
          fields,
          // allow-forced-review: The user explicitly requires proposed schedule changes to await review.
          autoMerge: false,
          message:
            "Proposed roadmap dates and dependencies; review before changing the schedule.",
        }),
      );
    },
  };
}
