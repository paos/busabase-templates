import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00Z"));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/providers/demo.js", async route => {
    const source = await (await route.fetch()).text();
    await route.fulfill({ contentType: "text/javascript", body: source.replace("async propose()", "async propose(row, fields)").replace('return { status: "queued" };', 'window.proposals = [...(window.proposals || []), {id: row.id, fields}]; return { status: "queued" };') });
  });
  await page.goto((process.env.ROADMAP_PREVIEW_URL || "http://127.0.0.1:3108") + "/?demo=1");
  const move = page.locator('[data-drag-milestone="demo-ready"][data-edge="move"]');
  await move.waitFor();
  assert.equal(await page.locator(".row-label.child").evaluateAll(rows => rows.every(row => row.querySelectorAll("button").length === 1)), true);
  await mkdir("coverage/scheduling", { recursive: true });
  await page.screenshot({ path: "coverage/scheduling/roadmap.png" });
  const geometry = () => move.locator("..").evaluate(el => [el.style.left, el.style.width].map(value => +parseFloat(value).toFixed(4)));
  const original = await geometry();
  const close = () => page.locator("#editor .close").click();
  async function cancel() {
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await page.locator(".milestone-nav [aria-current]").innerText(), "Overview");
    await close();
  }
  async function drag(edge, days, cancel = false) {
    const control = page.locator(`[data-drag-milestone="demo-ready"][data-edge="${edge}"]`);
    const rect = await control.boundingBox();
    const pixels = await control.evaluate(el => el.closest(".track").clientWidth / 84);
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + pixels * days, rect.y + rect.height / 2, { steps: 8 });
    await page.locator(".drag-date-preview:visible").waitFor();
    if (cancel) await page.keyboard.press("Escape");
    else await page.screenshot({ path: "coverage/scheduling/drag.png" });
    await page.mouse.up();
  }
  await drag("move", 3);
  await page.getByRole("heading", { name: "Dates & dependencies" }).waitFor();
  assert.equal(await page.getByLabel("Start", { exact: true }).inputValue(), "2026-11-26");
  assert.equal(await page.getByLabel("Finish", { exact: true }).inputValue(), "2026-12-14");
  assert.deepEqual(await geometry(), original);
  assert.equal(await page.evaluate(() => (window.proposals || []).length), 0);
  await cancel();
  await drag("start", 2);
  assert.equal(await page.getByLabel("Start", { exact: true }).inputValue(), "2026-11-25");
  assert.equal(await page.getByLabel("Finish", { exact: true }).inputValue(), "2026-12-11");
  await cancel();
  await drag("end", -2);
  assert.equal(await page.getByLabel("Start", { exact: true }).inputValue(), "2026-11-23");
  assert.equal(await page.getByLabel("Finish", { exact: true }).inputValue(), "2026-12-09");
  await cancel();
  await drag("move", 4, true);
  assert.equal(await page.locator("dialog[open]").count(), 0);
  assert.deepEqual(await geometry(), original);
  await move.focus();
  await page.keyboard.press("Shift+ArrowRight");
  assert.equal(await page.getByLabel("Start", { exact: true }).inputValue(), "2026-11-30");
  await cancel();
  await page.locator(".row-label.child").getByRole("button", { name: "Product demo ready", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Dates & dependencies", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Submit proposal" }).isDisabled(), true);
  await page.getByRole("button", { name: "Remove dependency Launch page published", exact: true }).click();
  assert.equal(await page.locator('#dependency-count').innerText(), "0 selected");
  await page.getByLabel("Find dependencies").fill("Pricing page");
  await page.getByRole("checkbox", { name: /^Pricing page published/ }).check();
  assert.equal(await page.locator("#dependency-count").innerText(), "1 selected");
  await page.getByRole("button", { name: "Start after dependencies", exact: true }).click();
  await page.screenshot({ path: "coverage/scheduling/editor.png" });
  const proposed = {
    "start-date": await page.getByLabel("Start", { exact: true }).inputValue(),
    "end-date": await page.getByLabel("Finish", { exact: true }).inputValue(),
    "depends-on": ["pricing-ready"],
  };
  await page.getByRole("button", { name: "Submit proposal" }).click();
  await page.getByRole("status").filter({ hasText: "Schedule proposal submitted for review" }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.proposals[0].fields), proposed);
  assert.equal(await page.locator(".milestone-nav [aria-current]").innerText(), "Overview");
  await close();
  assert.deepEqual(await geometry(), original);
  await move.click();
  assert.equal(await page.locator(".milestone-nav [aria-current]").innerText(), "Overview");
  await page.getByRole("button", {name:"Dates & dependencies", exact:true}).click();
  assert.equal(await page.getByLabel("Start", { exact: true }).inputValue(), "2026-11-23");
  assert.ok((await page.locator("#dependency-selected").innerText()).includes("Launch page published"));
  await cancel();
  // Choosing a successor as a predecessor creates a loop and cannot be submitted.
  await page.locator(".row-label.child").getByRole("button", { name: "Launch page published", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Dates & dependencies", exact: true }).click();
  await page.getByLabel("Find dependencies").fill("Product demo");
  await page.getByRole("checkbox", { name: /^Product demo ready/ }).check();
  assert.ok((await page.locator(".schedule-checks").innerText()).includes("loop"));
  assert.equal(await page.getByRole("button", { name: "Submit proposal" }).isDisabled(), true);
  await cancel();
  // Narrow/mobile layout, horizontally scrolled timeline, real touch dragging.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".timeline").evaluate(el => el.scrollLeft = 350);
  await move.scrollIntoViewIfNeeded();
  const rect = await move.boundingBox();
  const point = { x: Math.max(30, Math.min(250, rect.x + rect.width / 2)), y: rect.y + rect.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x + 45, y: point.y }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.getByRole("heading", { name: "Dates & dependencies" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator("#editor").evaluate(el => el.scrollWidth > el.clientWidth), false);
  assert.ok(await page.getByRole("button", { name: "Submit proposal" }).evaluate(el => {
    const rect = el.getBoundingClientRect(); return rect.bottom <= innerHeight && rect.top >= 0;
  }));
  assert.ok(await page.locator(".schedule-dates input").evaluateAll(inputs => inputs.every(input => {
    const parent = input.closest(".schedule-dates").getBoundingClientRect();
    const box = input.getBoundingClientRect(); return box.left >= parent.left && box.right <= parent.right;
  })));
  await page.screenshot({ path: "coverage/scheduling/mobile.png" });
  await cancel();
  assert.deepEqual(errors, []);
  console.log("Scheduling verified: move/start/end drag, Escape, keyboard, unchanged canonical dates, named dependency removal/search, alignment, cycle blocking, single combined review proposal, mobile touch and layout.");
} finally { await browser.close(); }
