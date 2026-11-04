import { sampleRecords } from "../demo-data.js";
export function createDemoProvider() {
  const data = structuredClone(sampleRecords);
  for (const rows of Object.values(data))
    for (const row of rows) row.id = row.key;
  return {
    name: "Demo · changes stay in this preview",
    async page(key) {
      return { records: structuredClone(data[key]), nextCursor: null };
    },
    async save(key, row, fields) {
      if (row)
        Object.assign(data[key].find((r) => r.id === row.id).fields, fields);
      else data[key].push({ id: crypto.randomUUID(), fields });
      return { status: "saved" };
    },
    async propose() {
      return { status: "queued" };
    },
  };
}
