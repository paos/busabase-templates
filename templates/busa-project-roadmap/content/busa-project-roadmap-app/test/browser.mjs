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
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(url.href);
  await page.getByRole("heading", { name: "Roadmap", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "December launch", exact: true })
    .first()
    .click();
  await page.mouse.move(1000, 700);
  await page.mouse.wheel(0, 10000);
  await page.waitForTimeout(200);
  assert.ok(
    await page.evaluate(() => scrollY > 0),
    "Mouse wheel must scroll the project page",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Launch results reviewed", exact: true })
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight;
      }),
    "The last December milestone must be reachable",
  );
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  const contrast = await page.locator("dialog[open]").evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
  }));
  assert.deepEqual(contrast, {
    background: "rgb(255, 255, 255)",
    color: "rgb(32, 55, 47)",
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Roadmap", exact: true }).click();
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
    "Browser checks passed: wheel scrolling, dark-mode dialog, timeline, proposal, complete, reopen, create, mobile, console.",
  );
} finally {
  await browser.close();
}
