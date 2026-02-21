import { expect, test } from "@playwright/test";
import { createSurface, getErrors, waitForApi } from "./helpers";

test.describe("Form validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
  });

  test("shows error for regex pattern violation", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "FormProbe",
          path: "/email",
          pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"
        }
      ]
    });

    const input = page.getByTestId("form-probe");
    const errorSpan = page.getByTestId("form-probe-error");

    await input.fill("not-an-email");

    await expect(errorSpan).toHaveText("Value does not match required pattern.");
  });

  test("clears error on valid input", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "FormProbe",
          path: "/email",
          pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"
        }
      ]
    });

    const input = page.getByTestId("form-probe");
    const errorSpan = page.getByTestId("form-probe-error");

    // First enter invalid value
    await input.fill("bad");
    await expect(errorSpan).toHaveText("Value does not match required pattern.");

    // Then enter valid value
    await input.fill("good@example.com");
    await expect(errorSpan).toHaveText("");
  });

  test("validates with built-in check (required)", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "FormProbe",
          path: "/field",
          checks: [{ call: "required" }]
        }
      ]
    });

    const input = page.getByTestId("form-probe");
    const errorSpan = page.getByTestId("form-probe-error");

    // Type something first, then clear to trigger required validation
    await input.fill("something");
    await input.fill("");

    await expect(errorSpan).toHaveText("Validation check 'required' failed.");

    // Verify error was dispatched
    const errors = await getErrors(page);
    const requiredError = (errors as Array<{ code: string }>).find(
      (e) => e.code === "A2UI_VALIDATION_CHECK_FAILED"
    );
    expect(requiredError).toBeTruthy();
  });

  test("validates with email check", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "FormProbe",
          path: "/email",
          checks: [{ call: "email" }]
        }
      ]
    });

    const input = page.getByTestId("form-probe");
    const errorSpan = page.getByTestId("form-probe-error");

    // Invalid email
    await input.fill("not-valid");
    await expect(errorSpan).toHaveText("Validation check 'email' failed.");

    // Valid email
    await input.fill("user@example.com");
    await expect(errorSpan).toHaveText("");
  });

  test("multiple checks run in sequence", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "FormProbe",
          path: "/email",
          checks: [{ call: "required" }, { call: "email" }]
        }
      ]
    });

    const input = page.getByTestId("form-probe");
    const errorSpan = page.getByTestId("form-probe-error");

    // Non-empty but not email fails email check
    await input.fill("notanemail");
    await expect(errorSpan).toHaveText("Validation check 'email' failed.");

    // Valid email passes all
    await input.fill("test@example.com");
    await expect(errorSpan).toHaveText("");
  });
});
