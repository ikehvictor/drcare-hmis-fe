import { expect, test, type Page } from "@playwright/test";

// Seed: Medical Records and Cash Point entitled but off; numbering not yet saved ({PREFIX}/{SEQ:6}, prefix LKS).
test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const YY = String(new Date().getFullYear()).slice(-2);
const NEXT_YY = String(new Date().getFullYear() + 1).slice(-2);

const moduleSwitch = (page: Page, name: string) => page.getByRole("switch", { name: `${name} on` });
const planList = (page: Page) => page.getByRole("list", { name: "Modules on your plan" });

async function switchOnBoth(page: Page) {
  await page.goto("/admin/modules");
  await moduleSwitch(page, "Cash Point").click();
  await page.getByRole("dialog").getByRole("button", { name: "Switch on both" }).click();
  await expect(moduleSwitch(page, "Cash Point")).toHaveAttribute("aria-checked", "true");
}

test.describe("modules", () => {
  test("shows the plan: core always on, entitled modules off, others locked", async ({ page }) => {
    await page.goto("/admin/modules");
    await expect(planList(page).getByRole("listitem")).toHaveCount(3);
    await expect(planList(page)).toContainText("Always on");
    await expect(moduleSwitch(page, "Medical Records")).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("list", { name: "Modules not on your plan" }).getByRole("listitem")).toHaveCount(6);
  });

  test("switching on Cash Point brings Medical Records with it", async ({ page }) => {
    await page.goto("/admin/modules");
    await moduleSwitch(page, "Cash Point").click();
    const dialog = page.getByRole("dialog", { name: "Cash Point needs Medical Records" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Switch on both" }).click();
    await expect(page.getByRole("status")).toContainText("Medical Records and Cash Point are on");
    await expect(moduleSwitch(page, "Medical Records")).toHaveAttribute("aria-checked", "true");
    await expect(moduleSwitch(page, "Cash Point")).toHaveAttribute("aria-checked", "true");
  });

  test("switching off Medical Records warns and takes Cash Point with it; cancel keeps both", async ({ page }) => {
    await switchOnBoth(page);

    await moduleSwitch(page, "Medical Records").click();
    let dialog = page.getByRole("dialog", { name: "Switch off Medical Records and Cash Point?" });
    await expect(dialog).toContainText("Cash Point depends on Medical Records");
    await expect(dialog).toContainText("Nothing is deleted");
    await expect(dialog).toContainText("Records Officer");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(moduleSwitch(page, "Cash Point")).toHaveAttribute("aria-checked", "true");

    await moduleSwitch(page, "Medical Records").click();
    dialog = page.getByRole("dialog", { name: "Switch off Medical Records and Cash Point?" });
    await dialog.getByRole("button", { name: "Switch off" }).click();
    await expect(moduleSwitch(page, "Medical Records")).toHaveAttribute("aria-checked", "false");
    await expect(moduleSwitch(page, "Cash Point")).toHaveAttribute("aria-checked", "false");
  });

  test("request a module that isn't on the plan", async ({ page }) => {
    await page.goto("/admin/modules");
    await page.getByRole("button", { name: "Request Laboratory" }).click();
    await expect(page.getByRole("status")).toContainText("We've told Dr. Care you'd like Laboratory");
    await expect(page.getByRole("button", { name: "Laboratory requested" })).toBeDisabled();
    await page.goto("/admin");
    await expect(page.getByText("asked Dr. Care to add Laboratory")).toBeVisible();
  });

  test("permissions of a switched-off module don't count", async ({ page }) => {
    await page.goto("/admin/users/usr_musa");
    const records = page.getByRole("region", { name: "Medical Records" });
    await expect(records).toContainText("Module off");
    await expect(records.getByText("Register new patients — not allowed")).toBeAttached();

    await page.goto("/admin/roles/role_records");
    await expect(page.getByRole("region", { name: "Medical Records" })).toContainText("Module off.");

    await switchOnBoth(page);
    await page.goto("/admin/users/usr_musa");
    await expect(
      page.getByRole("region", { name: "Medical Records" }).getByText("Register new patients — allowed"),
    ).toBeAttached();
  });

  test("Cash Point options validate and save", async ({ page }) => {
    await page.goto("/admin/modules");
    await page
      .getByRole("link", { name: /4 options/ })
      .last()
      .click();
    await expect(page.getByRole("heading", { name: "Cash Point", level: 1 })).toBeVisible();
    await expect(page.getByText("Cash Point is off. You can set its options now")).toBeVisible();

    const deposit = page.getByRole("checkbox", { name: "Deposit", exact: true });
    await expect(deposit).toBeDisabled();
    await page.getByRole("switch", { name: "Allow deposits" }).click();
    await expect(deposit).toBeEnabled();
    await deposit.check();

    for (const m of ["Cash", "POS", "Bank transfer", "Deposit"])
      await page.getByRole("checkbox", { name: m, exact: true }).uncheck();
    await page.getByRole("button", { name: "Save options" }).click();
    await expect(page.getByText("Pick at least one.")).toBeVisible();

    await page.getByRole("checkbox", { name: "Cash", exact: true }).check();
    await page.getByLabel("Refunds need approval above").fill("25000");
    await page.getByRole("button", { name: "Save options" }).click();
    await expect(page.getByRole("status")).toContainText("Cash Point options saved");
    await expect(page.getByRole("button", { name: "Save options" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel("Refunds need approval above")).toHaveValue("25000");
    await expect(page.getByRole("checkbox", { name: "POS", exact: true })).not.toBeChecked();
  });
});

test.describe("patient numbering", () => {
  const preview = (page: Page) => page.getByRole("list", { name: "Example numbers" });
  const problems = (page: Page) => page.getByRole("list", { name: "Problems with this format" });

  test("previews the default format and saves it the first time without asking", async ({ page }) => {
    await page.goto("/admin/numbering");
    await expect(page.getByText("Medical Records is off")).toBeVisible();
    await expect(page.getByTestId("next-number")).toHaveText("LKS/000001");
    await expect(preview(page)).toContainText("LKS/000002");
    await expect(preview(page)).toContainText("LKS/000003");
    await expect(page.getByText("Room for 999,999 patients")).toBeVisible();

    await page.getByRole("button", { name: "Save format" }).click();
    await expect(page.getByRole("status")).toContainText("Patient number format saved");
    await expect(page.getByRole("button", { name: "Save format" })).toHaveCount(0);
  });

  test("blocks formats that would repeat numbers", async ({ page }) => {
    await page.goto("/admin/numbering");
    const format = page.getByLabel("Format", { exact: true });

    await format.fill("{PREFIX}/");
    await expect(problems(page)).toContainText("Add a running number");

    await format.fill("{PREFIX}/{SEQ:6}");
    await page.getByRole("radio", { name: /One counter per branch/ }).check();
    await expect(problems(page)).toContainText("add {BR}");

    await page.getByRole("button", { name: /Branch, year, number/ }).click();
    await expect(page.getByTestId("next-number")).toHaveText(`LKS-${YY}-00001`);
    // Per-branch counters: the annex starts its own count.
    await expect(preview(page).getByRole("listitem").nth(1)).toContainText(`LKA-${YY}-00001`);
    await expect(preview(page).getByRole("listitem").nth(2)).toContainText(`LKS-${YY}-00002`);

    await format.fill("{BR}-{SEQ:5}");
    await page.getByLabel("Restart the running number").selectOption("yearly");
    await expect(problems(page)).toContainText("add {YY} or {YYYY}");
    await expect(page.getByRole("button", { name: "Save format" })).toBeVisible();
    await expect(page.getByText("to fix before saving")).toBeVisible();

    await format.fill("{BR}-{YY}-{SEQ:5}");
    await expect(preview(page).getByRole("listitem").last()).toContainText("First patient next year");
    await expect(preview(page).getByRole("listitem").last()).toContainText(`LKS-${NEXT_YY}-00001`);
  });

  test("continues from paper records and checks the digits fit", async ({ page }) => {
    await page.goto("/admin/numbering");
    await page.getByRole("button", { name: /Number \/ year/ }).click();
    await page.getByLabel("First number").fill("4572");
    await expect(page.getByTestId("next-number")).toHaveText(`4572/${YY}`);
    await expect(preview(page)).toContainText(`4573/${YY}`);
    await page.getByLabel("First number").fill("12345");
    await expect(problems(page)).toContainText("more digits than {SEQ:4} allows");
  });

  test("token buttons insert at the cursor", async ({ page }) => {
    await page.goto("/admin/numbering");
    const format = page.getByLabel("Format", { exact: true });
    await format.click();
    await format.press("End");
    await page.getByRole("button", { name: "Insert Short year" }).click();
    await expect(format).toHaveValue("{PREFIX}/{SEQ:6}{YY}");
  });

  test("changing a saved format asks first and shows before and after", async ({ page }) => {
    await page.goto("/admin/numbering");
    await page.getByRole("button", { name: "Save format" }).click();
    await page.getByRole("button", { name: /Branch, year, number/ }).click();
    await page.getByRole("button", { name: "Save format" }).click();
    const dialog = page.getByRole("dialog", { name: "Change the patient number format?" });
    await expect(dialog).toContainText("LKS/000001");
    await expect(dialog).toContainText(`LKS-${YY}-00001`);
    await expect(dialog).toContainText("keep their numbers");
    await dialog.getByRole("button", { name: "Change format" }).click();
    await page.reload();
    await expect(page.getByLabel("Format", { exact: true })).toHaveValue("{BR}-{YY}-{SEQ:5}");
  });
});

test("finishing modules and numbering completes the setup checklist", async ({ page }) => {
  await switchOnBoth(page);
  await page.goto("/admin/numbering");
  await page.getByRole("button", { name: "Save format" }).click();
  await page.goto("/admin");
  await expect(page.getByText("6 of 6 done")).toBeVisible();
  await expect(page.getByText("Modules on")).toBeVisible();
});

test("no horizontal page scroll on stage 3 pages", async ({ page }) => {
  for (const path of ["/admin/modules", "/admin/modules/cash-point", "/admin/numbering"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
