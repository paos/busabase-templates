import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { appConfig } from "../app/js/config.js";
const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url)),
);
if (!/^\d+\.\d+\.\d+$/.test(pkg.dependencies["busabase-sdk"]))
  throw new Error("Pin the SDK exactly.");
if (
  appConfig.binding !== "runtime" ||
  appConfig.spaceId ||
  appConfig.bases.some((b) => b.baseId)
)
  throw new Error("Templates must bind at runtime.");
for (const file of [
  "server.js",
  "app/js/app.js",
  "app/js/model.js",
  "app/js/roadmap-resize.js",
  "app/js/milestone-drag.js",
  "app/js/providers/live.js",
])
  execFileSync(process.execPath, ["--check", file]);
for (const file of [
  "app/vendor/busabase-sdk.js",
  "app/vendor/busabase-airapp.js",
  "app/vendor/busabase-airapp-gate.js",
])
  await readFile(file);
console.log(
  "Runtime binding, exact SDK pin, browser bundles and syntax checked.",
);
