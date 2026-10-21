import { expect, test, type Page } from "@playwright/test";

// Seed: Medical Records off, numbering not saved, no patients. Desk user Tunde Bakare (Records Officer, Main Campus);
// Ada Okafor (Super Admin) can work at both branches. Categories GEN, CHD, ANC, COR.
const KEY = "drcare-admin-demo-v6";
const YY = String(new Date().getFullYear()).slice(-2);

test.beforeEach(async ({ page }) => {
  await page.goto("/desk");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

interface Setup {
  numbering?: Record<string, unknown>;
  records?: Record<string, boolean>;
  recordsOn?: boolean;
}

/** Switches Medical Records on and saves a numbering format straight into the demo store, then reloads. */
async function setup(page: Page, { numbering = {}, records = {}, recordsOn = true }: Setup = {}) {
  await page.evaluate(
    ({ key, numbering, records, recordsOn }) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      const mr = s.modules["medical-records"];
      s.modules["medical-records"] = { ...mr, enabled: recordsOn, settings: { ...mr.settings, ...records } };
      s.numbering = { ...s.numbering, configured: true, ...numbering };
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key: KEY, numbering, records, recordsOn },
  );
  await page.reload();
}

// Next keeps pages you've left in the document, hidden, so only look at what's on screen.
const visibleTestId = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

/** On phones the sidebar is a drawer. */
async function openNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open navigation" });
  if (await menu.isVisible()) await menu.click();
}

const form = (page: Page) => page.getByRole("form", { name: "Register a patient" });

interface PatientDetails {
  category?: string;
  first?: string;
  last?: string;
  sex?: string;
  dob?: string;
  phone?: string;
}

async function fillCore(page: Page, p: PatientDetails = {}) {
  const f = form(page);
  await f.getByRole("radio", { name: new RegExp(`^${p.category ?? "General"} `) }).check();
  await f.getByLabel("First name").fill(p.first ?? "Chiamaka");
  await f.getByLabel("Surname").fill(p.last ?? "Obi");
  await f.getByLabel("Sex").selectOption(p.sex ?? "Female");
  await f.getByLabel(/^Date of birth/).fill(p.dob ?? "1990-04-12");
  await f.getByLabel("Phone number").fill(p.phone ?? "0803 111 2222");
}

async function register(page: Page, p: PatientDetails = {}) {
  await page.goto("/desk/register");
  await fillCore(page, p);
  await form(page).getByRole("button", { name: "Register patient" }).click();
  await expect(visibleTestId(page, "registered-banner")).toBeVisible();
  return (await visibleTestId(page, "patient-number").textContent())!;
}

test.describe("front desk access", () => {
  test("explains and blocks the desk while Medical Records is off, then works once the admin switches it on", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Medical Records is switched off" })).toBeVisible();
    await page.goto("/desk/register");
    await expect(page.getByRole("heading", { name: "Medical Records is switched off" })).toBeVisible();
    await expect(page.getByRole("form", { name: "Register a patient" })).toHaveCount(0);

    await page.getByRole("link", { name: "Open Modules in the hospital admin" }).click();
    await page.getByRole("switch", { name: "Medical Records on" }).click();
    await expect(page.getByRole("switch", { name: "Medical Records on" })).toHaveAttribute("aria-checked", "true");

    // Numbers come from the admin's format, so the desk waits until one is saved.
    await page.goto("/desk/register");
    await expect(page.getByRole("heading", { name: "Patient numbers aren't set up yet" })).toBeVisible();
    await page.getByRole("link", { name: "Open Patient numbering in the hospital admin" }).click();
    await page.getByRole("button", { name: "Save format" }).click();
    await expect(page.getByRole("status")).toContainText("Patient number format saved");

    await page.goto("/desk/register");
    await expect(form(page)).toBeVisible();
  });

  test("the sign-in page and admin menu lead to the desk; the desk links back to the admin", async ({ page }) => {
    await setup(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Continue at the front desk" }).click();
    await expect(page.getByRole("heading", { name: "Find a patient" })).toBeVisible();
    await openNav(page);
    await page.getByRole("link", { name: "Hospital admin" }).click();
    await expect(page.getByRole("heading", { name: "Good morning, Ada" })).toBeVisible();
    // Earlier routes stay in the page, hidden, so ask for the visible admin menu by role.
    await page.getByRole("button", { name: /^AO/ }).click();
    await page.getByRole("menuitem", { name: "Open the front desk" }).click();
    await expect(page.getByRole("heading", { name: "Find a patient" })).toBeVisible();
  });

  test("desk users come from roles: only active users who may register patients, at their own branches", async ({
    page,
  }) => {
    await setup(page);
    await expect(page.getByLabel("Working at").getByRole("option")).toHaveText(["Main Campus"]);
    await page.getByRole("button", { name: "Signed in as Tunde Bakare" }).click();
    // Musa is only invited and Ngozi is a cashier, so neither can register patients.
    await expect(page.getByRole("menuitemradio")).toHaveText(["Ada Okafor", "Tunde Bakare"]);
    await page.getByRole("menuitemradio", { name: "Ada Okafor" }).click();
    await expect(page.getByLabel("Working at").getByRole("option")).toHaveText(["Main Campus", "Lekki Annex Clinic"]);
  });
});

test.describe("registering patients", () => {
  test("a category picks its form, required fields are checked, and the patient gets the next number", async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/desk/register");
    await expect(page.getByText("Choose a category to see its registration form.")).toBeVisible();

    // The Child form asks for a parent or guardian; General doesn't.
    await form(page)
      .getByRole("radio", { name: /^Child / })
      .check();
    await expect(form(page).getByRole("group", { name: "Parent or guardian" })).toBeVisible();
    await form(page)
      .getByRole("radio", { name: /^General / })
      .check();
    await expect(form(page).getByRole("group", { name: "Parent or guardian" })).toHaveCount(0);
    await expect(form(page).getByRole("group", { name: "Next of kin" })).toBeVisible();
    await expect(page.getByTestId("next-number")).toHaveText("LKS/000001");

    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(form(page).getByRole("alert")).toHaveText("5 fields need attention.");
    await expect(form(page).getByLabel("First name")).toBeFocused();
    await expect(form(page).getByText("Choose sex.")).toBeVisible();

    await fillCore(page, { phone: "12" });
    await form(page).getByLabel("Email").fill("not-an-email");
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(form(page).getByText("Enter a phone number with at least 7 digits.")).toBeVisible();
    await expect(form(page).getByText("Enter an email address like name@example.com.")).toBeVisible();

    await form(page).getByLabel("Phone number").fill("0803 111 2222");
    await form(page).getByLabel("Email").fill("");
    await form(page).getByLabel("Next of kin name").fill("Emeka Obi");
    await form(page).getByRole("button", { name: "Register patient" }).click();

    await expect(visibleTestId(page, "registered-banner")).toContainText("Registered Chiamaka Obi as LKS/000001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chiamaka Obi");
    const summary = page.getByRole("definition");
    await expect(summary.filter({ hasText: "12 Apr 1990" })).toHaveCount(2);
    await expect(page.getByLabel("Next of kin", { exact: true })).toContainText("Emeka Obi");
    await expect(page.getByLabel("Summary")).toContainText("Main Campus by Tunde Bakare");

    await page.getByRole("link", { name: "Register another" }).click();
    // A blank form, not the last patient's details.
    await expect(form(page).getByLabel("Next of kin name")).toHaveValue("");
    await fillCore(page, { first: "Bola", last: "Ade", phone: "0805 000 1111" });
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(visibleTestId(page, "patient-number")).toHaveText("LKS/000002");
  });

  test("Medical Records options: optional phone, estimated age and hidden next of kin", async ({ page }) => {
    await setup(page, { records: { requirePhone: false, captureNextOfKin: false } });
    await page.goto("/desk/register");
    await form(page)
      .getByRole("radio", { name: /^General / })
      .check();
    await expect(form(page).getByRole("group", { name: "Next of kin" })).toHaveCount(0);
    await form(page).getByLabel("First name").fill("Musa");
    await form(page).getByLabel("Surname").fill("Garba");
    await form(page).getByLabel("Sex").selectOption("Male");
    await form(page).getByLabel("Doesn't know their date of birth").check();
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(form(page).getByRole("alert")).toHaveText("1 field needs attention.");
    await expect(form(page).getByLabel("Estimated age (years)")).toBeFocused();
    await form(page).getByLabel("Estimated age (years)").fill("200");
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(form(page).getByText("Enter a whole number of years, 0 to 120.")).toBeVisible();
    await form(page).getByLabel("Estimated age (years)").fill("60");
    await form(page).getByRole("button", { name: "Register patient" }).click();

    const summary = page.getByLabel("Summary");
    await expect(summary).toContainText(`born about ${new Date().getFullYear() - 60}`);
    await expect(summary).toContainText(/(59|60) years \(estimated\)/);
    await expect(page.getByLabel("Patient details")).toContainText("Not known · estimated age 60");
  });

  test("estimated age is not offered when the admin turns it off", async ({ page }) => {
    await setup(page, { records: { allowEstimatedAge: false } });
    await page.goto("/desk/register");
    await form(page)
      .getByRole("radio", { name: /^General / })
      .check();
    await expect(form(page).getByLabel(/^Date of birth/)).toBeVisible();
    await expect(form(page).getByLabel("Doesn't know their date of birth")).toHaveCount(0);
  });
});

test.describe("patient numbers", () => {
  test("count per branch with a starting number, and never repeat", async ({ page }) => {
    await setup(page, {
      numbering: { template: "{BR}-{YY}-{SEQ:5}", scope: "branch", reset: "yearly", startAt: 4571 },
    });
    // Ada can work at both branches.
    await page.getByRole("button", { name: "Signed in as Tunde Bakare" }).click();
    await page.getByRole("menuitemradio", { name: "Ada Okafor" }).click();

    expect(await register(page, { first: "Ada", phone: "0801 000 0001" })).toBe(`LKS-${YY}-04571`);
    expect(await register(page, { first: "Ben", phone: "0801 000 0002" })).toBe(`LKS-${YY}-04572`);
    await page.getByLabel("Working at").selectOption({ label: "Lekki Annex Clinic" });
    expect(await register(page, { first: "Cy", phone: "0801 000 0003" })).toBe(`LKA-${YY}-04571`);

    // The admin switches to one hospital-wide counter that would restart at 4571: taken numbers are skipped.
    await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      s.numbering = { ...s.numbering, template: "LKS-{YY}-{SEQ:5}", scope: "hospital" };
      localStorage.setItem(key, JSON.stringify(s));
    }, KEY);
    await page.reload();
    await page.getByLabel("Working at").selectOption({ label: "Main Campus" });
    expect(await register(page, { first: "Dayo", phone: "0801 000 0004" })).toBe(`LKS-${YY}-04573`);
  });

  test("count per category", async ({ page }) => {
    await setup(page, { numbering: { template: "{CAT}/{SEQ:4}", scope: "category", reset: "never", startAt: 1 } });
    expect(await register(page, { category: "General", first: "Ada", phone: "0801 000 0001" })).toBe("GEN/0001");
    expect(await register(page, { category: "Corporate staff", first: "Ife", phone: "0801 000 0002" })).toBe(
      "COR/0001",
    );
    expect(await register(page, { category: "General", first: "Ben", phone: "0801 000 0003" })).toBe("GEN/0002");
  });
});

test.describe("duplicates", () => {
  test("same name, date of birth and phone asks first; the clerk can open the existing record", async ({ page }) => {
    await setup(page);
    const first = await register(page);

    await page.goto("/desk/register");
    // Different spacing, case and phone style still match.
    await fillCore(page, { first: "chiamaka ", last: "OBI", phone: "+234 803 111 2222" });
    await form(page).getByRole("button", { name: "Register patient" }).click();
    const dialog = page.getByRole("dialog", { name: "Possible match" });
    await expect(dialog.getByRole("list", { name: "Possible matches" })).toContainText(first);
    await dialog.getByRole("link", { name: "Yes, open record" }).click();
    await expect(visibleTestId(page, "patient-number")).toHaveText(first);
    await expect(visibleTestId(page, "registered-banner")).toHaveCount(0);

    await page.goto("/desk");
    await expect(page.getByRole("table", { name: "Patients" }).getByRole("row")).toHaveCount(2);
  });

  test("registering anyway records the override in the audit log", async ({ page }) => {
    await setup(page);
    const first = await register(page);
    await page.goto("/desk/register");
    await fillCore(page);
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await page.getByRole("button", { name: "No, register a new patient" }).click();
    await expect(visibleTestId(page, "patient-number")).toHaveText("LKS/000002");

    await page.goto("/admin/audit");
    const entry = page.getByTestId("audit-entry").filter({ hasText: "registered patient Chiamaka Obi as LKS/000002" });
    await entry.getByRole("button", { name: /Show \d+ changes/ }).click();
    await expect(entry.getByRole("row", { name: /Possible duplicate/ })).toContainText(first);
  });

  test("no prompt when the admin turns the duplicate check off", async ({ page }) => {
    await setup(page, { records: { duplicateCheck: false } });
    await register(page);
    expect(await register(page)).toBe("LKS/000002");
  });
});

test.describe("search and audit", () => {
  test("finds patients by number, name, phone and old card number", async ({ page }) => {
    await setup(page, { numbering: { keepLegacyNumber: true } });
    await page.goto("/desk");
    await expect(page.getByText("No patients registered yet")).toBeVisible();

    await page.goto("/desk/register");
    await fillCore(page, { first: "Chiamaka", last: "Obi" });
    await form(page).getByLabel("Old card number").fill("OPD/1234/19");
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(page.getByLabel("Summary")).toContainText("OPD/1234/19");
    await register(page, { first: "Tobi", last: "Adeyemi", phone: "0907 555 4444" });

    await page.goto("/desk");
    const table = page.getByRole("table", { name: "Patients" });
    await expect(page.getByText("Recently registered")).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(3);

    const search = page.getByLabel("Search patients");
    const expectOnly = async (q: string, name: string) => {
      await search.fill(q);
      await expect(table.getByRole("row")).toHaveCount(2);
      await expect(table.getByRole("link")).toHaveText(name);
    };
    await expectOnly("LKS/000002", "Tobi Adeyemi");
    await expectOnly("000001", "Chiamaka Obi");
    await expectOnly("obi chiam", "Chiamaka Obi");
    await expectOnly("+234 907 555", "Tobi Adeyemi");
    await expectOnly("opd/1234", "Chiamaka Obi");

    await search.fill("nobody here");
    await expect(page.getByText("No patient matches “nobody here”")).toBeVisible();

    await search.fill("adeyemi");
    await table.getByRole("link", { name: "Tobi Adeyemi" }).click();
    await expect(visibleTestId(page, "patient-number")).toHaveText("LKS/000002");
  });

  test("old card numbers aren't searched when the hospital doesn't keep them", async ({ page }) => {
    await setup(page, { numbering: { keepLegacyNumber: true } });
    await page.goto("/desk/register");
    await fillCore(page);
    await form(page).getByLabel("Old card number").fill("OPD/1234/19");
    await form(page).getByRole("button", { name: "Register patient" }).click();
    await expect(visibleTestId(page, "registered-banner")).toBeVisible();

    await setup(page, { numbering: { keepLegacyNumber: false } });
    await page.goto("/desk");
    await page.getByLabel("Search patients").fill("OPD/1234");
    await expect(page.getByText("No patient matches “OPD/1234”")).toBeVisible();
    await page.goto("/desk/register");
    await form(page)
      .getByRole("radio", { name: /^General / })
      .check();
    await expect(form(page).getByLabel("Old card number")).toHaveCount(0);
  });

  test("each registration writes a sensitive Patients audit entry at the branch, linking to the record", async ({
    page,
  }) => {
    await setup(page);
    const number = await register(page);

    await page.goto("/admin/audit");
    await page.getByLabel("Filter by category").selectOption("Patients");
    const entry = page.getByTestId("audit-entry").first();
    await expect(page.getByTestId("audit-count")).toContainText("1 of");
    await expect(entry).toContainText(`Tunde Bakare registered patient Chiamaka Obi as ${number}`);
    await expect(entry).toContainText("Records Officer · Main Campus · Front desk · this browser");
    await expect(entry).toContainText("Sensitive");
    await entry.getByRole("button", { name: /Show \d+ changes/ }).click();
    const changes = entry.getByRole("table", { name: "Changes" });
    await expect(changes.getByRole("row", { name: /Patient number/ })).toContainText(number);
    await expect(changes.getByRole("row", { name: /Category/ })).toContainText("General (GEN)");
    await expect(changes.getByRole("row", { name: /Date of birth/ })).toContainText("12 Apr 1990");

    await entry.getByRole("link", { name: `Open Chiamaka Obi (${number})` }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chiamaka Obi");
  });

  test("unknown record ids show a friendly not-found page", async ({ page }) => {
    await setup(page);
    await page.goto("/desk/patients/pat_missing");
    await expect(page.getByRole("heading", { name: "Patient not found" })).toBeVisible();
  });
});
