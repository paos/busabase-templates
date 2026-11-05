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
  const visibleMilestones = () =>
    page.locator(".row-label.child:visible").count();
  assert.equal(await visibleMilestones(), 17);
  await page
    .getByRole("button", { name: "Collapse December launch", exact: true })
    .click();
  assert.equal(await visibleMilestones(), 2);
  await page.reload();
  await page
    .getByRole("button", { name: "Expand December launch", exact: true })
    .waitFor();
  assert.equal(await visibleMilestones(), 2);
  await page
    .getByRole("button", { name: "Expand December launch", exact: true })
    .click();
  assert.equal(await visibleMilestones(), 17);
  await page.getByRole("button", { name: "Collapse all", exact: true }).click();
  assert.equal(await visibleMilestones(), 0);
  await page.reload();
  await page.getByRole("heading", { name: "Roadmap", exact: true }).waitFor();
  assert.equal(await visibleMilestones(), 0);
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  assert.equal(await visibleMilestones(), 17);
  await page.reload();
  await page.getByRole("heading", { name: "Roadmap", exact: true }).waitFor();
  assert.equal(await visibleMilestones(), 17);

  await page
    .getByRole("button", { name: "December launch", exact: true })
    .first()
    .click();
  assert.equal(
    await page
      .getByRole("columnheader", { name: "Project", exact: true })
      .count(),
    0,
  );
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
  assert.equal(
    await page
      .getByRole("columnheader", { name: "Project", exact: true })
      .count(),
    1,
  );
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
  await page.getByLabel("Find dependencies").fill("Launch page");
  await page
    .getByRole("checkbox", { name: /^Launch page published/ })
    .check();
  await page.getByLabel("Find dependencies").fill("Pricing page");
  await page
    .getByRole("checkbox", { name: /^Pricing page published/ })
    .check();
  assert.equal(
    await page.locator("#dependency-count").innerText(),
    "2 selected",
  );
  assert.ok(
    (await page.locator("#dependency-selected").innerText()).includes(
      "Launch page published",
    ),
  );
  assert.ok(
    (await page.locator("#dependency-selected").innerText()).includes(
      "Pricing page published",
    ),
  );

  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  const dependencyRow = page
    .locator("tbody tr")
    .filter({
      has: page
        .locator("td:first-child")
        .getByRole("button", {
          name: "Handover checklist agreed",
          exact: true,
        }),
    });
  assert.ok(
    (await dependencyRow.locator(".dependency-cell").innerText()).includes(
      "Launch page published",
    ),
  );
  assert.ok(
    (await dependencyRow.locator(".dependency-cell").innerText()).includes(
      "Pricing page published",
    ),
  );
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
  const partial = await browser.newPage();
  partial.on("pageerror", (error) => errors.push(error.message));
  await partial.route("**/demo-data.js", async (route) => {
    const data = {
      projects: [{ key: "visible", fields: { title: "Visible project", lane: "now" } }],
      milestones: [{ key: "partial", fields: { title: "Partial milestone", project: "unloaded-project", "depends-on": ["unloaded-dependency"], done: false } }],
    };
    await route.fulfill({ contentType: "text/javascript", body: `export const sampleRecords = ${JSON.stringify(data)};` });
  });
  await partial.goto(url.href);
  await partial.getByRole("button", { name: "Review dependencies →" }).click();
  assert.ok((await partial.locator("#editor").innerText()).includes("outside the loaded records"));
  assert.equal(await partial.locator("[data-fix]").count(), 0);
  await partial.locator("#editor [data-close]").first().click();
  await partial.getByRole("button", { name: "Milestones", exact: true }).click();
  await partial.getByRole("button", { name: "Partial milestone", exact: true }).click();
  await partial.getByRole("button", { name: "Edit milestone", exact: true }).click();
  assert.equal(await partial.locator('select[name="project"]').inputValue(), "unloaded-project");
  assert.equal(await partial.locator('input[name="depends-on"]:checked').inputValue(), "unloaded-dependency");
  await partial.getByLabel("Responsible person").fill("Updated owner");
  await partial.getByRole("button", { name: "Save changes", exact: true }).click();
  await partial.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  await partial.getByRole("button", { name: "Partial milestone", exact: true }).click();
  await partial.getByRole("button", { name: "Edit milestone", exact: true }).click();
  assert.equal(await partial.locator('select[name="project"]').inputValue(), "unloaded-project");
  assert.equal(await partial.locator('input[name="depends-on"]:checked').inputValue(), "unloaded-dependency");
  assert.equal(await partial.getByLabel("Responsible person").inputValue(), "Updated owner");
  await partial.close();
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: collapse persistence, project-specific columns, wheel scrolling, dark-mode dialog, timeline, proposal, complete, reopen, create, mobile, console.",
  );
} finally {
  await browser.close();
}
