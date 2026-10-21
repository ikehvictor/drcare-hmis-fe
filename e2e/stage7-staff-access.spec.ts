import { expect, test, type Page } from "@playwright/test";

// Seed: staff categories Doctor and Nurse (with specialties), Records & front desk (suggests Records Officer),
// Cashier & accounts (suggests Cashier) and Administration. No functions of the hospital's own yet.
test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function openNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
}

async function switchOnModules(page: Page) {
  await page.goto("/admin/modules");
  await page.getByRole("switch", { name: "Cash Point on" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Switch on both" }).click();
  await expect(page.getByRole("switch", { name: "Cash Point on" })).toHaveAttribute("aria-checked", "true");
}

const usersTable = (page: Page) => page.getByRole("table", { name: "Users" });
const auditEntry = (page: Page, text: string) => page.getByTestId("audit-entry").filter({ hasText: text });

test.describe("creating accounts", () => {
  test("the admin creates a working account with a category, specialty, suggested roles and a password", async ({
    page,
  }) => {
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Create account" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a staff account" });

    // Picking a category ticks its suggested roles until the admin chooses roles themselves.
    await dialog.getByLabel("Staff category").selectOption({ label: "Records & front desk" });
    await expect(dialog.getByRole("checkbox", { name: "Records Officer" })).toBeChecked();
    await dialog.getByLabel("Staff category").selectOption({ label: "Doctor" });
    await expect(dialog.getByRole("checkbox", { name: "Records Officer" })).not.toBeChecked();
    await dialog.getByLabel("Specialty").selectOption("Paediatrics");

    await dialog.getByLabel("Full name").fill("Kemi Adebayo");
    await dialog.getByLabel("Work email").fill("kemi.adebayo@lakeside.example");
    await dialog.getByRole("checkbox", { name: "Records Officer" }).check();
    await dialog.getByLabel("Password", { exact: true }).fill("kemi.adebayo1");
    await dialog.getByRole("button", { name: "Create account" }).click();
    await expect(dialog.getByText("Don't use their email name in the password.")).toBeVisible();

    await dialog.getByLabel("Password", { exact: true }).fill("onlyletters");
    await dialog.getByRole("button", { name: "Create account" }).click();
    await expect(dialog.getByText("Mix letters and numbers.")).toBeVisible();

    await dialog.getByLabel("Password", { exact: true }).fill("Paeds-Ward-7");
    await dialog.getByRole("button", { name: "Show password" }).first().click();
    await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    await dialog.getByLabel("Type it again").fill("Paeds-Ward-7");
    await dialog.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("status")).toContainText("Account created for Kemi Adebayo");
    const row = usersTable(page).getByRole("row", { name: /Kemi Adebayo/ });
    await expect(row).toContainText("Doctor · Paediatrics");
    await expect(row).toContainText("Active");

    await row.getByRole("link").click();
    await expect(page.getByTestId("staff-line")).toHaveText("Doctor · Paediatrics");
    await expect(page.getByText("Must change password")).toBeVisible();

    // The log says a password was set, never what it is.
    await page.goto("/admin/audit");
    const entry = auditEntry(page, "created an account for Kemi Adebayo");
    await entry.getByRole("button", { name: /Show \d+ changes/ }).click();
    await expect(entry.getByRole("row", { name: /Password/ })).toContainText(
      "Set by admin · must change at first sign-in",
    );
    await expect(entry.getByRole("row", { name: /Staff category/ })).toContainText("Doctor · Paediatrics");
    await expect(page.getByText("Paeds-Ward-7")).toHaveCount(0);
  });

  test("the admin can set a new password for someone else, but not for themselves here", async ({ page }) => {
    await page.goto("/admin/users/usr_ada");
    await expect(page.getByRole("button", { name: "Set password" })).toHaveCount(0);

    await page.goto("/admin/users/usr_ngozi");
    await expect(page.getByText("Must change password")).toHaveCount(0);
    await page.getByRole("button", { name: "Set password" }).click();
    const dialog = page.getByRole("dialog", { name: "Set a password for Ngozi Eze" });
    await dialog.getByLabel("New password").fill("short1");
    await dialog.getByRole("button", { name: "Set password" }).click();
    await expect(dialog.getByText("Use at least 10 characters.")).toBeVisible();
    await dialog.getByLabel("New password").fill("CashPoint2026");
    await dialog.getByLabel("Type it again").fill("CashPoint2026");
    await dialog.getByRole("button", { name: "Set password" }).click();
    await expect(page.getByRole("status")).toContainText("New password set for Ngozi Eze");
    await expect(page.getByText("Must change password")).toBeVisible();
  });
});

test.describe("staff categories", () => {
  test("add, edit and delete categories; a category in use can't be deleted", async ({ page }) => {
    await openNav(page);
    await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Staff categories" }).click();
    await expect(page.getByRole("heading", { name: "Staff categories", level: 1 })).toBeVisible();
    const list = page.getByRole("list", { name: "Staff categories" });
    await expect(list.getByRole("listitem")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Delete Records & front desk" })).toBeDisabled();

    await page.getByRole("button", { name: "Add category" }).click();
    let dialog = page.getByRole("dialog", { name: "Add a staff category" });
    await dialog.getByLabel("Category name").fill("nurse");
    await dialog.getByRole("button", { name: "Save category" }).click();
    await expect(dialog.getByText("There's already a category called nurse.")).toBeVisible();
    await dialog.getByLabel("Category name").fill("Pharmacist");
    await dialog.getByLabel("New specialty").fill("Clinical pharmacy");
    await dialog.getByLabel("New specialty").press("Enter");
    await dialog.getByLabel("New specialty").fill("Oncology pharmacy");
    await dialog.getByRole("checkbox", { name: "Cashier", exact: true }).check();
    await dialog.getByRole("button", { name: "Save category" }).click();

    const card = list.getByRole("listitem").filter({ hasText: "Pharmacist" });
    await expect(card).toContainText("Clinical pharmacy");
    await expect(card).toContainText("Oncology pharmacy");
    await expect(card).toContainText("Cashier");

    await page.getByRole("button", { name: "Edit Pharmacist" }).click();
    dialog = page.getByRole("dialog", { name: "Edit Pharmacist" });
    await dialog.getByRole("button", { name: "Remove Oncology pharmacy" }).click();
    await dialog.getByRole("button", { name: "Save category" }).click();
    await expect(card).not.toContainText("Oncology pharmacy");

    await page.getByRole("button", { name: "Delete Pharmacist" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete category" }).click();
    await expect(list.getByRole("listitem")).toHaveCount(5);

    await page.goto("/admin/audit");
    await page.getByLabel("Filter by category").selectOption("Staff");
    await expect(page.getByTestId("audit-entry")).toHaveCount(3);
  });
});

test.describe("access for one person", () => {
  test("give and take away single functions on top of roles; it's saved and logged", async ({ page }) => {
    await switchOnModules(page);
    await page.goto("/admin/users/usr_tunde"); // Records Officer
    const cash = page.getByRole("region", { name: "Cash Point" });
    const records = page.getByRole("region", { name: "Medical Records" });

    await cash.getByRole("switch", { name: "Allow Receive payments" }).click();
    await records.getByRole("switch", { name: "Allow Edit patient details" }).click();
    await expect(cash.getByText("Given to Tunde directly")).toBeVisible();
    await expect(records.getByText("Taken away from Tunde")).toBeVisible();
    await expect(page.getByTestId("access-summary")).toContainText("1 given directly, 1 taken away");

    // Switching one back clears the change instead of recording it.
    await cash.getByRole("switch", { name: "Allow Receive payments" }).click();
    await expect(page.getByTestId("access-summary")).not.toContainText("given directly");
    await cash.getByRole("switch", { name: "Allow Receive payments" }).click();

    await page.getByRole("button", { name: "Save access" }).click();
    await expect(page.getByRole("status")).toContainText("Tunde Bakare's access saved");
    await page.reload();
    await expect(page.getByText("Receive payments — allowed")).toBeAttached();
    await expect(page.getByText("Edit patient details — not allowed")).toBeAttached();

    // Other people with the same role keep the role's functions.
    await page.goto("/admin/users/usr_musa");
    await expect(page.getByText("Edit patient details — allowed")).toBeAttached();

    await page.goto("/admin/audit");
    const entry = auditEntry(page, "changed what Tunde Bakare can do");
    await expect(entry).toContainText("Sensitive");
    await entry.getByRole("button", { name: /Show \d+ changes/ }).click();
    await expect(entry.getByRole("row", { name: /Also allowed added/ })).toContainText("Receive payments");
    await expect(entry.getByRole("row", { name: /Not allowed added/ })).toContainText("Edit patient details");
  });

  test("discard puts everything back; you and Super Admins can't be changed here", async ({ page }) => {
    await page.goto("/admin/users/usr_ngozi");
    await page.getByRole("switch", { name: "Allow Issue refunds" }).click();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByRole("switch", { name: "Allow Issue refunds" })).toHaveAttribute("aria-checked", "true");

    await page.goto("/admin/users/usr_ada");
    await expect(page.getByText("You can't change your own access")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Allow Manage users" })).toBeDisabled();
  });

  test("taking away Register new patients removes someone from the front desk", async ({ page }) => {
    await switchOnModules(page);
    await page.goto("/admin/users/usr_musa");
    await page.getByRole("switch", { name: "Allow Register new patients" }).click();
    await page.getByRole("button", { name: "Save access" }).click();
    await expect(page.getByRole("status")).toContainText("access saved");

    await page.goto("/desk");
    await page.getByRole("button", { name: "Signed in as Tunde Bakare" }).click();
    await expect(page.getByRole("menuitemradio")).toHaveText(["Ada Okafor", "Tunde Bakare"]);
  });
});

test.describe("the hospital's own functions", () => {
  test("add a function, put it in a role, give it to a person; it can't be deleted while in use", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Add function" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a function" });
    await dialog.getByRole("button", { name: "Add function" }).click();
    await expect(dialog.getByText("Name the function")).toBeVisible();
    await dialog.getByLabel("Function", { exact: true }).fill("receive payments");
    await dialog.getByRole("button", { name: "Add function" }).click();
    await expect(dialog.getByText("There's already a function called receive payments.")).toBeVisible();
    await dialog.getByLabel("Function", { exact: true }).fill("Approve the nurses' duty roster");
    await dialog.getByLabel("Description").fill("Signs off the weekly ward rota.");
    await dialog.getByRole("button", { name: "Add function" }).click();

    const own = page.getByRole("list", { name: "Your hospital's own functions" });
    await expect(own).toContainText("Approve the nurses' duty roster");
    await expect(own).toContainText("Not enforced yet");
    // Super Admins have every function, including new ones.
    await expect(page.getByRole("list", { name: "Roles" })).toContainText("20 of 20 permissions");

    await page.goto("/admin/roles/role_records");
    const group = page.getByRole("region", { name: "Your hospital's functions" });
    await group.getByRole("checkbox", { name: "Approve the nurses' duty roster" }).check();
    await page.getByRole("button", { name: "Save role" }).click();
    await expect(page.getByRole("status")).toContainText("Records Officer saved");

    await page.goto("/admin/users/usr_tunde");
    const mine = page.getByRole("region", { name: "Your hospital's functions" });
    await expect(mine).toContainText("Not enforced yet");
    await expect(mine.getByText("Approve the nurses' duty roster — allowed")).toBeAttached();

    await page.goto("/admin/users/usr_ngozi");
    await page.getByRole("switch", { name: "Allow Approve the nurses' duty roster" }).click();
    await page.getByRole("button", { name: "Save access" }).click();
    await expect(page.getByText("Approve the nurses' duty roster — allowed")).toBeAttached();

    await page.goto("/admin/roles");
    await expect(page.getByRole("button", { name: "Delete Approve the nurses' duty roster" })).toBeDisabled();
  });

  test("an unused function can be deleted", async ({ page }) => {
    await page.goto("/admin/roles");
    await page.getByRole("button", { name: "Add function" }).click();
    await page.getByRole("dialog").getByLabel("Function", { exact: true }).fill("Run the morning huddle");
    await page.getByRole("dialog").getByRole("button", { name: "Add function" }).click();
    await page.getByRole("button", { name: "Delete Run the morning huddle" }).click();
    await expect(page.getByText("No functions of your own yet.")).toBeVisible();
  });
});

test("no horizontal page scroll on the new pages", async ({ page }) => {
  for (const path of ["/admin/staff", "/admin/users/usr_tunde", "/admin/roles"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
