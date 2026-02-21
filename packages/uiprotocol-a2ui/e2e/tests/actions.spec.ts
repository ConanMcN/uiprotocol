import { expect, test } from "@playwright/test";
import { clearCaptures, createSurface, getActions, getErrors, getHostEffects, sendMessage, waitForApi } from "./helpers";

test.describe("Action dispatch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
  });

  test("button click fires action callback", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ActionProbe",
          action: { event: "submit" },
          valueForValidation: "anything"
        }
      ]
    });

    await page.getByTestId("action-probe").click();

    const actions = await getActions(page);
    expect(actions).toHaveLength(1);
    expect((actions[0] as Record<string, unknown>).action).toEqual(
      expect.objectContaining({ event: "submit" })
    );
  });

  test("action with validation gating (checks) blocks on failure", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ActionProbe",
          action: { event: "save" },
          checks: [{ call: "required" }],
          valueForValidation: ""
        }
      ]
    });

    await page.getByTestId("action-probe").click();

    // Action should be blocked
    const actions = await getActions(page);
    expect(actions).toHaveLength(0);

    // Error should be reported
    const errors = await getErrors(page);
    const validationError = (errors as Array<{ code: string }>).find(
      (e) => e.code === "A2UI_VALIDATION_CHECK_FAILED"
    );
    expect(validationError).toBeTruthy();
  });

  test("action passes after validation fix", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ActionProbe",
          action: { event: "save" },
          checks: [{ call: "required" }],
          valueForValidation: ""
        }
      ]
    });

    // First click: fails validation
    await page.getByTestId("action-probe").click();
    let actions = await getActions(page);
    expect(actions).toHaveLength(0);

    // Update the component to have a valid value
    await sendMessage(page, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [{ id: "root", valueForValidation: "valid" }]
      }
    });

    await clearCaptures(page);

    // Second click: passes validation
    await page.getByTestId("action-probe").click();
    actions = await getActions(page);
    expect(actions).toHaveLength(1);
  });

  test("action with pattern gating blocks on mismatch", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ActionProbe",
          action: { event: "validate" },
          pattern: "^\\d+$",
          valueForValidation: "abc"
        }
      ]
    });

    await page.getByTestId("action-probe").click();

    const actions = await getActions(page);
    expect(actions).toHaveLength(0);

    const errors = await getErrors(page);
    const patternError = (errors as Array<{ code: string }>).find(
      (e) => e.code === "A2UI_VALIDATION_REGEX_FAILED"
    );
    expect(patternError).toBeTruthy();
  });

  test("action with openUrl triggers host effect", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ActionProbe",
          action: {
            event: "navigate",
            openUrl: "https://example.com"
          },
          valueForValidation: "ok"
        }
      ]
    });

    await page.getByTestId("action-probe").click();

    const effects = await getHostEffects(page);
    expect(effects).toHaveLength(1);
    expect((effects[0] as Record<string, unknown>).type).toBe("openUrl");
    expect((effects[0] as Record<string, unknown>).url).toBe("https://example.com");

    // Action should also fire
    const actions = await getActions(page);
    expect(actions).toHaveLength(1);
  });
});
