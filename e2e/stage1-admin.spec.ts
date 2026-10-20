import { expect, test, type Page } from "@playwright/test";

// Each test starts from the seeded demo data (2 branches, plan limit 3).
test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function openNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
}

test("sign-in screen leads to the admin overview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign in to your hospital" })).toBeVisible();
  await page.getByRole("link", { name: "Continue as Hospital Super Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Setup checklist" })).toBeVisible();
  await expect(page.getByText("4 of 6 done")).toBeVisible();
});

test("navigation reaches branches and shows later stages as coming soon", async ({ page }) => {
  await openNav(page);
  await page.getByRole("link", { name: "Branches & service points" }).click();
  await expect(page.getByRole("heading", { name: "Branches & service points", level: 1 })).toBeVisible();

  await openNav(page);
  await page.getByRole("link", { name: /Modules/ }).click();
  await expect(page.getByRole("heading", { name: "Modules" })).toBeVisible();
  await expect(page.getByText("planned for stage 3")).toBeVisible();
});

test("search filters the branch list", async ({ page }) => {
  await page.goto("/admin/branches");
  const list = page.getByRole("list", { name: "Branches" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page.getByLabel("Search branches").fill("lekki");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("Lekki Annex Clinic");
  await page.getByLabel("Search branches").fill("zzz");
  await expect(page.getByText("No branches match")).toBeVisible();
});

test("add a branch with validation, then hit the plan limit", async ({ page }) => {
  await page.goto("/admin/branches");
  await page.getByRole("button", { name: "Add branch" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a branch" });

  // Empty submit shows errors and keeps the dialog open.
  await dialog.getByRole("button", { name: "Add branch" }).click();
  await expect(dialog.getByText("Enter the branch name.")).toBeVisible();
  await expect(dialog.getByText("Use 2 to 5 letters")).toBeVisible();

  // Duplicate code is rejected.
  await dialog.getByLabel("Branch name").fill("Ikeja Clinic");
  await dialog.getByLabel("Code").fill("lks");
  await dialog.getByLabel("City / area").fill("Ikeja");
  await dialog.getByLabel("State").fill("Lagos");
  await dialog.getByRole("button", { name: "Add branch" }).click();
  await expect(dialog.getByText("LKS is already used by another branch.")).toBeVisible();

  await dialog.getByLabel("Code").fill("ikj");
  await dialog.getByRole("button", { name: "Add branch" }).click();

  // Lands on the new branch's page, empty of service points.
  await expect(page.getByRole("heading", { name: "Ikeja Clinic", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Service points" }).getByText("No service points yet")).toBeVisible();

  await page.getByRole("link", { name: "All branches" }).click();
  await expect(page.getByTestId("branch-usage")).toContainText("3 of 3 branches used");
  await expect(page.getByRole("button", { name: "Add branch" })).toBeDisabled();
});

test("add, edit and close a service point; changes survive a reload", async ({ page }) => {
  await page.goto("/admin/branches");
  await page.getByRole("link", { name: /Lekki Annex Clinic/ }).click();
  await expect(page.getByRole("heading", { name: "Lekki Annex Clinic", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Add service point" }).click();
  const add = page.getByRole("dialog", { name: "Add a service point" });
  await add.getByRole("button", { name: "Add service point" }).click();
  await expect(add.getByText("Enter a name staff will recognise")).toBeVisible();
  await add.getByLabel("Name").fill("Annex Lab");
  await add.getByLabel("Type").selectOption("Laboratory");
  await add.getByLabel("Location").fill("First floor");
  await add.getByRole("button", { name: "Add service point" }).click();

  const row = page.getByRole("row", { name: /Annex Lab/ });
  await expect(row).toBeVisible();

  await page.getByRole("button", { name: "Edit Annex Lab" }).click();
  const edit = page.getByRole("dialog", { name: "Edit service point" });
  await edit.getByLabel("Name").fill("Annex Laboratory");
  await edit.getByRole("button", { name: "Save changes" }).click();

  const toggle = page.getByRole("switch", { name: "Annex Laboratory open" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await page.reload();
  await expect(page.getByRole("switch", { name: "Annex Laboratory open" })).toHaveAttribute("aria-checked", "false");
});

test("deactivate and reactivate a branch; the main branch is protected", async ({ page }) => {
  await page.goto("/admin/branches/br_main");
  await expect(page.getByRole("button", { name: "Deactivate" })).toBeDisabled();

  await page.goto("/admin/branches/br_annex");
  await page.getByRole("button", { name: "Deactivate" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Deactivate branch" }).click();
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add service point" })).toBeDisabled();

  await page.getByRole("link", { name: "All branches" }).click();
  await expect(page.getByRole("list", { name: "Branches" }).getByRole("listitem")).toHaveCount(1);
  await page.getByLabel("Show inactive branches").check();
  await expect(page.getByRole("list", { name: "Branches" }).getByRole("listitem")).toHaveCount(2);

  await page.goto("/admin/branches/br_annex");
  await page.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();
});

test("activity feed records changes", async ({ page }) => {
  await page.goto("/admin/branches/br_main");
  await page.getByRole("switch", { name: "OPD Room 2 open" }).click();
  await openNav(page);
  await page.getByRole("link", { name: "Overview" }).click();
  await expect(page.getByText("opened service point OPD Room 2")).toBeVisible();
});

test("no horizontal page scroll", async ({ page }) => {
  for (const path of ["/", "/admin", "/admin/branches", "/admin/branches/br_main"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
