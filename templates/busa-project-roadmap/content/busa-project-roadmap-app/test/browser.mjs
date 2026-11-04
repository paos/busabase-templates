import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const url = new URL(process.env.ROADMAP_PREVIEW_URL || "http://127.0.0.1:3000");
url.searchParams.set("demo", "1");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
});
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url.href);
  await page.getByRole("heading", { name: "See what’s coming" }).waitFor();
  await page.getByRole("button", { name: "View conflicts →" }).click();
  await page.getByRole("button", { name: "Review proposed dates →" }).click();
  await page.getByRole("button", { name: "Submit proposal" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /proposal submitted for review/i })
    .waitFor();
  await page.getByRole("button", { name: "Milestones", exact: true }).click();
  await page
    .getByRole("button", { name: "Handover checklist agreed", exact: true })
    .click();
  await page
    .locator("#editor")
    .getByRole("button", { name: "Mark done", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  await page
    .getByRole("button", { name: "Handover checklist agreed", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit milestone", exact: true })
    .click();
  await page.getByLabel("Done — no acceptance step").uncheck();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  await page.getByRole("button", { name: "+ Project", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Browser test project");
  await page
    .getByLabel("Purpose, risks and decisions")
    .fill("Verify that a project can be created.");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Browser test project", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Roadmap", exact: true }).click();
  await mkdir("coverage/browser", { recursive: true });
  await page.screenshot({ path: "coverage/browser/desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "coverage/browser/mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: timeline, proposal, complete, reopen, create, mobile, console.",
  );
} finally {
  await browser.close();
}
