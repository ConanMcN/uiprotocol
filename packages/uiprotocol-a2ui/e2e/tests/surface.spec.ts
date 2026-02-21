import { expect, test } from "@playwright/test";
import { createSurface, sendMessage, waitForApi } from "./helpers";

test.describe("Surface lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
  });

  test("creates an empty surface and shows fallback", async ({ page }) => {
    await sendMessage(page, {
      version: "v0.9",
      createSurface: { surfaceId: "s1" }
    });

    const fallback = page.getByTestId("fallback-s1");
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveText("fallback");
  });

  test("creates surface with components and renders them", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Container", children: ["txt"] },
        { id: "txt", component: "Text", text: "Hello E2E" }
      ]
    });

    await expect(page.getByTestId("component-root")).toBeVisible();
    await expect(page.getByText("Hello E2E")).toBeVisible();
  });

  test("updates components on an existing surface", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Text", text: "First" }
      ]
    });

    await expect(page.getByText("First")).toBeVisible();

    // Update the text
    await sendMessage(page, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [{ id: "root", text: "Second" }]
      }
    });

    await expect(page.getByText("Second")).toBeVisible();
  });

  test("deletes a surface and removes its content", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Text", text: "Goodbye" }
      ]
    });

    await expect(page.getByText("Goodbye")).toBeVisible();

    await sendMessage(page, {
      version: "v0.9",
      deleteSurface: { surfaceId: "s1" }
    });

    // After deletion, the surface container should no longer exist
    await expect(page.getByTestId("surface-s1")).not.toBeVisible();
  });

  test("supports multiple concurrent surfaces", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Text", text: "Surface One" }
      ]
    });

    await createSurface(page, "s2", {
      components: [
        { id: "root", component: "Text", text: "Surface Two" }
      ]
    });

    await expect(page.getByText("Surface One")).toBeVisible();
    await expect(page.getByText("Surface Two")).toBeVisible();

    // Delete one, verify the other persists
    await sendMessage(page, {
      version: "v0.9",
      deleteSurface: { surfaceId: "s1" }
    });

    await expect(page.getByText("Surface One")).not.toBeVisible();
    await expect(page.getByText("Surface Two")).toBeVisible();
  });
});
