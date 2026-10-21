import { expect, test, type Page } from "@playwright/test";

// Seed: 5 roles (Super Admin locked), 4 users (Ada = you; Musa must change the password the admin set), limit 40.
test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function openNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
}

const usersTable = (page: Page) => page.getByRole("table", { name: "Users" });

// Permissions only count while their module is on (stage 3), so switch on Records and Cash Point first.
async function switchOnModules(page: Page) {
  await page.goto("/admin/modules");
  await page.getByRole("switch", { name: "Cash Point on" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Switch on both" }).click();
}

test.describe("roles", () => {
  test("lists default roles; Super Admin is locked and read-only", async ({ page }) => {
    await openNav(page);
    await page.getByRole("link", { name: "Roles & permissions" }).click();
    const list = page.getByRole("list", { name: "Roles" });
    await expect(list.getByRole("listitem")).toHaveCount(5);
    await expect(list).toContainText("19 of 19 permissions");

    await list.getByRole("link", { name: /Hospital Super Admin/ }).click();
    await expect(page.getByText("can't be changed or deleted")).toBeVisible();
    await expect(page.getByLabel("Role name")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete role" })).toHaveCount(0);
  });

  test("create a role by copying another, edit its permissions and save", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Create role" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a role" });

    await dialog.getByRole("button", { name: "Create and set permissions" }).click();
    await expect(dialog.getByText("Give the role a name")).toBeVisible();
    await dialog.getByLabel("Role name").fill("cashier");
    await dialog.getByRole("button", { name: "Create and set permissions" }).click();
    await expect(dialog.getByText("There's already a role called cashier.")).toBeVisible();

    await dialog.getByLabel("Role name").fill("Front Desk Officer");
    await dialog.getByLabel("Start from").selectOption({ label: "Copy of Records Officer" });
    await dialog.getByRole("button", { name: "Create and set permissions" }).click();

    await expect(page).toHaveURL(/\/admin\/roles\/role_/);
    const records = page.getByRole("region", { name: "Medical Records" });
    await expect(records.getByRole("checkbox", { name: "Register new patients" })).toBeChecked();

    // Tick all of Cash Point via the group checkbox, then untick one.
    const cash = page.getByRole("region", { name: "Cash Point" });
    await cash.getByRole("checkbox", { name: "Allow all Cash Point permissions" }).check();
    await expect(cash.getByText("8 of 8")).toBeVisible();
    await cash.getByRole("checkbox", { name: "Issue refunds" }).uncheck();
    await expect(cash.getByText("7 of 8")).toBeVisible();

    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save role" }).click();
    await expect(page.getByRole("status")).toContainText("Front Desk Officer saved");
    await expect(page.getByText("Unsaved changes")).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("region", { name: "Cash Point" }).getByText("7 of 8")).toBeVisible();
  });

  test("discard reverts unsaved changes", async ({ page }) => {
    await page.goto("/admin/roles/role_cashier");
    await page.getByRole("checkbox", { name: "Receive payments" }).uncheck();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("checkbox", { name: "Receive payments" })).toBeChecked();
  });

  test("a role in use can't be deleted; an unused one can", async ({ page }) => {
    await page.goto("/admin/roles/role_cashier");
    await expect(page.getByRole("button", { name: "Delete role" })).toBeDisabled();

    await page.goto("/admin/roles/role_accountant");
    await page.getByRole("button", { name: "Delete role" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete role" }).click();
    await expect(page).toHaveURL(/\/admin\/roles$/);
    await expect(page.getByRole("list", { name: "Roles" }).getByRole("listitem")).toHaveCount(4);
  });
});

test.describe("users", () => {
  test("search and filter the user list", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(usersTable(page).getByRole("row")).toHaveCount(5); // header + 4
    await expect(page.getByTestId("user-usage")).toContainText("4 of 40 users");

    await page.getByLabel("Search users").fill("ngozi");
    await expect(usersTable(page).getByRole("row")).toHaveCount(2);
    await page.getByLabel("Search users").fill("");

    await page.getByLabel("Filter by staff category").selectOption({ label: "Records & front desk" });
    await expect(usersTable(page).getByRole("row")).toHaveCount(3);
    await expect(usersTable(page)).toContainText("Musa Ibrahim");

    await page.getByLabel("Filter by staff category").selectOption("");
    await page.getByLabel("Filter by role").selectOption({ label: "Records Officer" });
    await expect(usersTable(page).getByRole("row")).toHaveCount(3);
  });

  test("create an account with validation, roles and branch access", async ({ page }) => {
    await switchOnModules(page);
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Create account" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a staff account" });

    await dialog.getByRole("button", { name: "Create account" }).click();
    await expect(dialog.getByText("Enter their full name.")).toBeVisible();
    await expect(dialog.getByText("Enter a valid email address.")).toBeVisible();
    await expect(dialog.getByText("Pick at least one role.")).toBeVisible();
    await expect(dialog.getByText("Use at least 10 characters.")).toBeVisible();

    await dialog.getByLabel("Full name").fill("Chioma Nwosu");
    await dialog.getByLabel("Work email").fill("TUNDE.bakare@lakeside.example");
    await dialog.getByLabel("Job title").fill("Cashier");
    await dialog.getByRole("checkbox", { name: "Cashier", exact: true }).check();
    await dialog.getByRole("radio", { name: "Only specific branches" }).check();
    await dialog.getByLabel("Password", { exact: true }).fill("Lakeside2026");
    await dialog.getByLabel("Type it again").fill("Lakeside2025");
    await dialog.getByRole("button", { name: "Create account" }).click();
    await expect(dialog.getByText("The two passwords don't match.")).toBeVisible();
    await expect(dialog.getByText("Someone already uses this email.")).toBeVisible();
    await expect(dialog.getByText("Pick at least one branch.")).toBeVisible();

    await dialog.getByLabel("Work email").fill("chioma.nwosu@lakeside.example");
    await dialog.getByRole("checkbox", { name: /Lekki Annex Clinic/ }).check();
    await dialog.getByLabel("Type it again").fill("Lakeside2026");
    await dialog.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("status")).toContainText("Account created for Chioma Nwosu");
    const row = usersTable(page).getByRole("row", { name: /Chioma Nwosu/ });
    await expect(row).toContainText("Active");
    await expect(page.getByTestId("user-usage")).toContainText("5 of 40 users");

    await row.getByRole("link").click();
    await expect(page.getByRole("heading", { name: "Chioma Nwosu", level: 1 })).toBeVisible();
    await expect(page.getByTestId("branch-access")).toHaveText("Lekki Annex Clinic");
    await expect(
      page.getByRole("region", { name: "Cash Point" }).getByText("Receive payments — allowed"),
    ).toBeAttached();
    await expect(
      page.getByRole("region", { name: "Cash Point" }).getByText("Issue refunds — not allowed"),
    ).toBeAttached();
  });

  test("effective permissions combine every role", async ({ page }) => {
    await switchOnModules(page);
    await page.goto("/admin/users/usr_musa"); // Records Officer + Cashier
    await expect(page.getByText("combined from 2 roles")).toBeVisible();
    await expect(page.getByText("Register new patients — allowed")).toBeAttached();
    await expect(page.getByText("Receive payments — allowed")).toBeAttached();
  });

  test("edit a user's roles", async ({ page }) => {
    await page.goto("/admin/users/usr_tunde");
    await page.getByRole("button", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit Tunde Bakare" });
    await dialog.getByRole("checkbox", { name: "Accountant" }).check();
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("combined from 2 roles")).toBeVisible();
    await expect(page.getByRole("link", { name: /Accountant/ })).toBeVisible();
  });

  test("suspend and reactivate; you can't suspend yourself or change your own roles", async ({ page }) => {
    await page.goto("/admin/users/usr_ada");
    await expect(page.getByRole("button", { name: "Suspend" })).toBeDisabled();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("dialog").getByRole("checkbox", { name: "Hospital Super Admin" })).toBeDisabled();
    await page.keyboard.press("Escape");

    await page.goto("/admin/users/usr_ngozi");
    await page.getByRole("button", { name: "Suspend" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suspend account" }).click();
    await expect(page.getByText("This account is suspended.")).toBeVisible();

    await page.getByRole("link", { name: "All users" }).click();
    await expect(page.getByTestId("user-usage")).toContainText("3 of 40 users");

    await page.goto("/admin/users/usr_ngozi");
    await page.getByRole("button", { name: "Reactivate" }).click();
    await expect(page.getByText("This account is suspended.")).toHaveCount(0);
  });

  test("the overview reflects users and activity", async ({ page }) => {
    await page.goto("/admin/users/usr_ngozi");
    await page.getByRole("button", { name: "Suspend" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suspend account" }).click();
    await openNav(page);
    await page.getByRole("link", { name: "Overview" }).click();
    await expect(page.getByText("suspended Ngozi Eze")).toBeVisible();
    await expect(page.getByText("4 of 6 done")).toBeVisible();
  });
});

test("no horizontal page scroll on stage 2 pages", async ({ page }) => {
  for (const path of ["/admin/users", "/admin/users/usr_musa", "/admin/roles", "/admin/roles/role_head_cashier"]) {
    await page.goto(path);
    await expect(page.locator("main h1, main h2").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
