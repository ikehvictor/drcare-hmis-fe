import { expect, test, type Page } from "@playwright/test";

// Seed: 3 forms (General, Child, Antenatal), 4 categories (GEN, CHD, ANC, COR), Medical Records off.
test.beforeEach(async ({ page }) => {
  await page.goto("/admin");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const categoriesTable = (page: Page) => page.getByRole("table", { name: "Patient categories" });
const section = (page: Page, title: string) => page.getByRole("region", { name: `Section: ${title}` });
const preview = (page: Page) => page.getByRole("form", { name: "Form preview" });

// A 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("registration forms", () => {
  test("lists forms with the categories that use them", async ({ page }) => {
    await page.goto("/admin/forms");
    await expect(page.getByText("Medical Records is off")).toBeVisible();
    const forms = page.getByRole("list", { name: "Forms" });
    await expect(forms.getByRole("listitem")).toHaveCount(3);
    await expect(forms.getByRole("listitem").filter({ hasText: "General registration" })).toContainText(
      "Corporate staff",
    );
    await expect(categoriesTable(page).getByRole("row")).toHaveCount(5);
  });

  test("add, validate and deactivate patient categories; the last one stays in use", async ({ page }) => {
    await page.goto("/admin/forms");
    await page.getByRole("button", { name: "Add category" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a patient category" });
    await dialog.getByLabel("Category name").fill("HMO patient");
    await dialog.getByLabel("Code").fill("h");
    await dialog.getByRole("button", { name: "Add category" }).click();
    await expect(dialog.getByText("Use 2 to 4 letters")).toBeVisible();
    await dialog.getByLabel("Code").fill("gen");
    await dialog.getByRole("button", { name: "Add category" }).click();
    await expect(dialog.getByText("GEN is already used by another category.")).toBeVisible();
    await dialog.getByLabel("Code").fill("hmo");
    await dialog.getByLabel("Registration form").selectOption({ label: "General registration" });
    await dialog.getByRole("button", { name: "Add category" }).click();
    await expect(categoriesTable(page).getByRole("row", { name: /HMO patient/ })).toContainText("HMO");

    for (const name of ["General", "Child", "Antenatal", "Corporate staff"])
      await page.getByRole("switch", { name: `${name} in use` }).click();
    await expect(page.getByRole("switch", { name: "HMO patient in use" })).toBeDisabled();
  });

  test("new category codes show up in the numbering preview", async ({ page }) => {
    await page.goto("/admin/forms");
    await page.getByRole("button", { name: "Edit General" }).click();
    await page.getByRole("dialog").getByLabel("Code").fill("ADT");
    await expect(page.getByRole("dialog")).toContainText("keep numbers with the old code");
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();

    await page.goto("/admin/numbering");
    await page.getByLabel("Format", { exact: true }).fill("{CAT}/{SEQ:5}");
    await page.getByRole("radio", { name: /One counter per patient category/ }).check();
    await expect(page.getByTestId("next-number")).toHaveText("ADT/00001");
    await expect(page.getByText("ADT · General")).toBeVisible();
  });

  test("create a form by copying another and land in the builder", async ({ page }) => {
    await page.goto("/admin/forms");
    await page.getByRole("button", { name: "Create form" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a form" });
    await dialog.getByLabel("Form name").fill("child registration");
    await dialog.getByRole("button", { name: "Create and edit" }).click();
    await expect(dialog.getByText("There's already a form called child registration.")).toBeVisible();
    await dialog.getByLabel("Form name").fill("School health");
    await dialog.getByLabel("Start from").selectOption({ label: "Copy of Child registration" });
    await dialog.getByRole("button", { name: "Create and edit" }).click();

    await expect(page).toHaveURL(/\/admin\/forms\/form_/);
    await expect(page.getByLabel("Form name")).toHaveValue("School health");
    await expect(section(page, "Parent or guardian")).toContainText("Parent or guardian phone");
    await expect(page.getByText("no category yet")).toBeVisible();
  });

  test("build a form: library and custom fields, required, order; saved after reload", async ({ page }) => {
    await page.goto("/admin/forms/form_general");
    const nok = section(page, "Next of kin");

    // Library field.
    await nok.getByRole("button", { name: "Add field to Next of kin" }).click();
    let dialog = page.getByRole("dialog", { name: "Add a field" });
    await dialog.getByLabel("Search the field library").fill("blood");
    await dialog
      .getByRole("list", { name: "Field library" })
      .getByRole("button", { name: /Blood group/ })
      .click();
    await expect(nok).toContainText("Blood group");

    // Custom dropdown needs two choices.
    await nok.getByRole("button", { name: "Add field to Next of kin" }).click();
    dialog = page.getByRole("dialog", { name: "Add a field" });
    await dialog.getByRole("tab", { name: "Make your own" }).click();
    await dialog.getByLabel("Label").fill("Preferred language");
    await dialog.getByLabel("Answer type").selectOption("select");
    await dialog.getByLabel("Choices").fill("English");
    await dialog.getByRole("button", { name: "Add field" }).click();
    await expect(dialog.getByText("needs at least two choices")).toBeVisible();
    await dialog.getByLabel("Choices").fill("English\nYoruba\nHausa\nIgbo");
    await dialog.getByLabel("Required").check();
    await dialog.getByRole("button", { name: "Add field" }).click();
    await expect(nok).toContainText("Preferred language");
    await expect(nok).toContainText("Dropdown · 4 choices");

    // Reorder: move it above Blood group.
    await nok.getByRole("button", { name: "Move Preferred language up" }).click();
    const labels = await nok.locator("li .font-medium").allTextContents();
    expect(labels.indexOf("Preferred language")).toBeLessThan(labels.indexOf("Blood group"));

    // The preview shows it as a required dropdown.
    await expect(preview(page).getByLabel(/Preferred language/)).toBeVisible();
    await expect(preview(page).getByText("Preferred language")).toBeVisible();

    await page.getByRole("button", { name: "Save form" }).click();
    await expect(page.getByRole("status")).toContainText("General registration saved");
    await page.reload();
    await expect(section(page, "Next of kin")).toContainText("Preferred language");
    await expect(page.getByRole("switch", { name: "Preferred language required" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("core fields stay; sections delete only when empty; a nameless form can't save", async ({ page }) => {
    await page.goto("/admin/forms/form_general");
    const details = section(page, "Patient details");
    await expect(details.getByRole("button", { name: "Remove First name" })).toHaveCount(0);
    await expect(details.getByRole("switch", { name: "First name required" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete section Patient details" })).toBeDisabled();

    await page.getByRole("button", { name: "Add section" }).click();
    await expect(section(page, "New section")).toContainText("No fields yet.");
    await page.getByRole("button", { name: "Delete section New section" }).click();
    await expect(section(page, "New section")).toHaveCount(0);

    await page.getByLabel("Form name").fill("");
    await page.getByRole("button", { name: "Save form" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Give the form a name.");
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByLabel("Form name")).toHaveValue("General registration");
  });

  test("the preview checks required fields like a clerk would", async ({ page }) => {
    await page.goto("/admin/forms/form_child");
    const pv = preview(page);
    await pv.getByRole("button", { name: "Check required fields" }).click();
    await expect(pv).toContainText(
      "Still needed: First name, Surname, Sex, Date of birth, Phone number, Parent or guardian name",
    );

    await pv.getByLabel(/^First name/).fill("Tolu");
    await pv.getByLabel(/^Surname/).fill("Adeyemi");
    await pv.getByLabel(/^Sex/).selectOption("Female");
    await pv.getByLabel("Don't know it? Estimated age").fill("6");
    await pv.getByLabel(/^Phone number/).fill("08031234567");
    await pv.getByLabel(/^Parent or guardian name/).fill("Bola Adeyemi");
    await pv.getByLabel(/^Parent or guardian phone/).fill("08031234567");
    await pv.getByRole("button", { name: "Check required fields" }).click();
    await expect(pv).toContainText("All required fields are filled in.");
  });

  test("Medical Records options shape the form", async ({ page }) => {
    await page.goto("/admin/modules/medical-records");
    await page.getByRole("switch", { name: "Phone number is required" }).click();
    await page.getByRole("switch", { name: "Capture next of kin" }).click();
    await page.getByRole("button", { name: "Save options" }).click();

    await page.goto("/admin/forms/form_general");
    await expect(page.getByText("Next of kin fields are hidden")).toBeVisible();
    await expect(preview(page).getByText("Next of kin name")).toHaveCount(0);
    await expect(page.getByRole("switch", { name: "Phone number required" })).toHaveAttribute("aria-checked", "false");
    await preview(page).getByRole("button", { name: "Check required fields" }).click();
    await expect(preview(page)).not.toContainText("Phone number,");
  });

  test("a form in use can't be deleted; an unused one can", async ({ page }) => {
    await page.goto("/admin/forms/form_anc");
    await expect(page.getByRole("button", { name: "Delete form" })).toBeDisabled();

    await page.goto("/admin/forms");
    await page.getByRole("button", { name: "Edit Antenatal" }).click();
    await page.getByRole("dialog").getByLabel("Registration form").selectOption({ label: "General registration" });
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();

    await page.goto("/admin/forms/form_anc");
    await page.getByRole("button", { name: "Delete form" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete form" }).click();
    await expect(page).toHaveURL(/\/admin\/forms$/);
    await expect(page.getByRole("list", { name: "Forms" }).getByRole("listitem")).toHaveCount(2);
  });
});

test.describe("settings", () => {
  test("hospital profile: rename, validate email, upload a logo", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel("Hospital name").fill("Lakeside Hospital & Maternity");
    await page.getByLabel("Contact email").fill("not-an-email");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Enter a valid contact email.");
    await page.getByLabel("Contact email").fill("hello@lakeside.example");

    await page
      .getByLabel("Upload logo")
      .setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(400 * 1024) });
    await expect(page.getByText("Keep the logo under 300 KB.")).toBeVisible();
    await page.getByLabel("Upload logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByRole("img", { name: "Hospital logo" })).toBeVisible();

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status")).toContainText("Settings saved");
    await page.reload();
    await expect(page.getByTestId("sidebar-hospital").first()).toHaveText("Lakeside Hospital & Maternity");
  });

  test("security settings and branch overrides inherit from the hospital", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Sign-in & security" }).click();
    await page.getByLabel("Sign out after inactivity").selectOption("10");
    await page.getByLabel("Minimum password length").fill("6");

    await page.getByRole("tab", { name: "Branch overrides" }).click();
    const annex = page.getByRole("row", { name: /Lekki Annex Clinic/ });
    await expect(annex).toContainText("Overridden");
    const main = page.getByLabel("Sign out after, Main Campus");
    await expect(main.locator("option").first()).toHaveText("Hospital setting (10 minutes)");
    await page.getByLabel("Sign out after, Lekki Annex Clinic").selectOption("");
    await expect(annex).not.toContainText("Overridden");

    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("tab", { name: /Sign-in & security/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("main").getByRole("alert")).toContainText("Minimum password length must be 8 to 32.");
    await page.getByLabel("Minimum password length").fill("12");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status")).toContainText("Settings saved");

    await page.goto("/admin");
    await expect(page.getByText("changed settings: sign-in & security, branch overrides")).toBeVisible();
  });

  test("approvals need an approver who is on duty and can do the action", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByRole("tab", { name: "Approvals" }).click();
    const rules = page.getByRole("table", { name: "Approval rules" });
    await expect(rules.getByRole("row", { name: /Issue refunds/ })).toContainText("1 active person");

    // Accountants can give discounts, but nobody active is an accountant.
    await page.getByLabel("Approver for Apply discounts & waivers").selectOption({ label: "Accountant" });
    await expect(rules.getByRole("row", { name: /Apply discounts/ })).toContainText("Nobody active has this role");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Nobody active can approve “Apply discounts & waivers”",
    );

    // Turning the rule off clears the problem.
    await page.getByRole("switch", { name: "Apply discounts & waivers needs approval" }).click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status")).toContainText("Settings saved");
  });
});

test("stage 4 pages: no console errors, no horizontal scroll", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/admin/forms", "/admin/forms/form_general", "/admin/settings"]) {
    await page.goto(path);
    await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  for (const tab of ["Sign-in & security", "Approvals", "Branch overrides"]) {
    await page.getByRole("tab", { name: tab }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, tab).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});
