import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

// Seed: 20 audit entries from 2 Sep to 20 Oct 2026 — 7 sign-ins, 5 by Dr. Care Support, 7 sensitive.
test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const entries = (page: Page) => page.getByTestId("audit-entry");
const count = (page: Page) => page.getByTestId("audit-count");
const newest = (page: Page) => entries(page).first();

test("shows the seeded history grouped by day, newest first", async ({ page }) => {
  await page.goto("/admin/audit");
  await expect(page.getByText("Entries can't be edited or deleted")).toBeVisible();
  await expect(count(page)).toHaveText("20 entries");
  await expect(entries(page)).toHaveCount(20);
  await expect(newest(page)).toContainText("Ada Okafor signed in");
  await expect(entries(page).last()).toContainText("onboarded Lakeside Specialist Hospital");

  const failed = entries(page).filter({ hasText: "failed to sign in as ngozi.eze" });
  await expect(failed).toContainText("Sensitive");
  await expect(failed).toContainText("Lekki Annex Clinic · Front desk PC 2");

  const support = entries(page).filter({ hasText: "started a support session" });
  await support.getByRole("button", { name: "Show 1 change" }).click();
  await expect(support.getByRole("table", { name: "Changes" })).toContainText(
    "Help setting up the Lekki Annex price list",
  );
});

test("records who, what, where and before/after for a change", async ({ page }) => {
  await page.goto("/admin/branches/br_annex");
  await page.getByRole("button", { name: "Deactivate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Deactivate branch" }).click();

  await page.goto("/admin/audit");
  await expect(count(page)).toHaveText("21 entries");
  const entry = newest(page);
  await expect(entry).toContainText("Ada Okafor deactivated branch Lekki Annex Clinic");
  await expect(entry).toContainText("Hospital Super Admin · Lekki Annex Clinic · Web admin");
  await entry.getByRole("button", { name: "Show 1 change" }).click();
  const changes = entry.getByRole("table", { name: "Changes" });
  await expect(changes.getByRole("row", { name: /Status/ })).toContainText("Active");
  await expect(changes.getByRole("row", { name: /Status/ })).toContainText("Inactive");

  await entry.getByRole("link", { name: "Open Lekki Annex Clinic" }).click();
  await expect(page.getByRole("heading", { name: "Lekki Annex Clinic", level: 1 })).toBeVisible();
});

test("role permission changes are sensitive and list what was added and removed", async ({ page }) => {
  await page.goto("/admin/roles/role_cashier");
  await page.getByRole("checkbox", { name: "Issue refunds" }).check();
  await page.getByRole("checkbox", { name: "Add charges" }).uncheck();
  await page.getByRole("button", { name: "Save role" }).click();
  await expect(page.getByRole("status")).toContainText("Cashier saved");

  await page.goto("/admin/audit");
  const entry = newest(page);
  await expect(entry).toContainText("updated role Cashier");
  await expect(entry).toContainText("Sensitive");
  await entry.getByRole("button", { name: "Show 2 changes" }).click();
  const changes = entry.getByRole("table", { name: "Changes" });
  await expect(changes.getByRole("row", { name: /Permissions added/ })).toContainText("Issue refunds");
  await expect(changes.getByRole("row", { name: /Permissions removed/ })).toContainText("Add charges");
});

test("settings changes show readable before and after values", async ({ page }) => {
  await page.goto("/admin/settings");
  await page.getByLabel("Hospital name").fill("Lakeside Hospital");
  await page.getByLabel("Upload logo").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.getByRole("tab", { name: "Approvals" }).click();
  await page.getByRole("switch", { name: "Merge duplicate patients needs approval" }).click();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved");

  await page.goto("/admin/audit");
  const entry = newest(page);
  await expect(entry).toContainText("changed settings: hospital profile, approvals");
  await expect(entry).toContainText("Sensitive");
  await entry.getByRole("button", { name: /Show 3 changes/ }).click();
  const changes = entry.getByRole("table", { name: "Changes" });
  await expect(changes.getByRole("row", { name: /Hospital name/ })).toContainText("Lakeside Specialist Hospital");
  await expect(changes.getByRole("row", { name: /Hospital name/ })).toContainText("Lakeside Hospital");
  await expect(changes.getByRole("row", { name: /Logo/ })).toContainText("New logo");
  await expect(changes).not.toContainText("data:image");
  await expect(changes.getByRole("row", { name: /Merge duplicate patients/ })).toContainText(
    "Approved by Hospital Super Admin",
  );
});

test("filters by category, person, sensitivity, text and dates", async ({ page }) => {
  await page.goto("/admin/audit");

  await page.getByLabel("Filter by category").selectOption("Sign-in");
  await expect(count(page)).toHaveText("7 of 20 entries");
  await page.getByLabel("Filter by category").selectOption("");

  await page.getByLabel("Filter by person").selectOption("Dr. Care Support");
  await expect(count(page)).toHaveText("5 of 20 entries");
  await page.getByLabel("Filter by person").selectOption("");

  await page.getByLabel("Only sensitive actions").check();
  await expect(count(page)).toHaveText("7 of 20 entries");
  await page.getByLabel("Only sensitive actions").uncheck();

  await page.getByLabel("Search the audit log").fill("ngozi");
  await expect(count(page)).toHaveText("4 of 20 entries");

  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("From date").fill("2026-10-01");
  await page.getByLabel("To date").fill("2026-10-10");
  await expect(count(page)).toHaveText("4 of 20 entries");

  await page.getByLabel("Search the audit log").fill("nothing like this");
  await expect(page.getByText("Nothing matches these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(count(page)).toHaveText("20 entries");
});

test("export downloads CSV, and the export itself is logged", async ({ page }) => {
  await page.goto("/admin/audit");
  await page.getByLabel("Filter by category").selectOption("Users");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile((await download.path())!, "utf8");
  const lines = csv.trim().split("\n");
  expect(lines[0]).toBe("Time (UTC),Who,Role,Category,What happened,Where,Via,Sensitive,Field,Before,After");
  expect(csv).toContain("Ada Okafor created an account for Musa Ibrahim (musa.ibrahim@lakeside.example)");
  expect(csv).not.toContain(",Sign-in,");

  await expect(page.getByRole("status")).toContainText("Exported 4 entries");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(newest(page)).toContainText("exported a filtered view of the audit log (4 entries)");
  await expect(newest(page)).toContainText("Audit");
});

test("long logs page with Show more", async ({ page }) => {
  await page.goto("/admin/branches/br_main");
  const toggle = page.getByRole("switch", { name: "OPD Room 2 open" });
  for (let i = 0; i < 6; i++) await toggle.click();

  await page.goto("/admin/audit");
  await expect(count(page)).toHaveText("26 entries");
  await expect(entries(page)).toHaveCount(25);
  await page.getByRole("button", { name: "Show 1 more" }).click();
  await expect(entries(page)).toHaveCount(26);
});

test("entries can't be changed, and deleted things keep their name", async ({ page }) => {
  await page.goto("/admin/roles/role_accountant");
  await page.getByRole("button", { name: "Delete role" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete role" }).click();

  await page.goto("/admin/audit");
  const entry = newest(page);
  await expect(entry).toContainText("deleted role Accountant");
  await expect(entry.getByRole("link")).toHaveCount(0);
  // The only controls on an entry are links and the change toggle; nothing edits or removes it.
  await expect(page.locator("main ol").getByRole("button", { name: /delete|remove|edit|undo/i })).toHaveCount(0);
});

test("audit page: no console errors, no horizontal scroll", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/admin/audit");
  await expect(entries(page).first()).toBeVisible();
  // Each click turns "Show" into "Hide", so keep opening the first one still closed.
  const closed = page.getByRole("button", { name: /^Show \d+ changes?$/ });
  while ((await closed.count()) > 0) await closed.first().click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
