import { expect, test } from "@playwright/test";
import { createSurface, getWarnings, sendMessage, waitForApi } from "./helpers";

test.describe("Component rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
  });

  test("renders a simple text component", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [{ id: "root", component: "Text", text: "Simple text" }]
    });

    await expect(page.getByText("Simple text")).toBeVisible();
  });

  test("renders nested components (parent with children)", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Container", children: ["child1", "child2"] },
        { id: "child1", component: "Text", text: "Child A" },
        { id: "child2", component: "Text", text: "Child B" }
      ]
    });

    const container = page.getByTestId("component-root");
    await expect(container).toBeVisible();
    await expect(page.getByText("Child A")).toBeVisible();
    await expect(page.getByText("Child B")).toBeVisible();
  });

  test("renders dynamic values from data model", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Text", text: { path: "/title" } }
      ],
      data: [{ path: "/title", value: "Dynamic Title" }]
    });

    await expect(page.getByText("Dynamic Title")).toBeVisible();
  });

  test("updates component props and re-renders", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [{ id: "root", component: "Text", text: "Before" }]
    });

    await expect(page.getByText("Before")).toBeVisible();

    await sendMessage(page, {
      version: "v0.9",
      updateComponents: {
        surfaceId: "s1",
        components: [{ id: "root", text: "After" }]
      }
    });

    await expect(page.getByText("After")).toBeVisible();
  });

  test("shows fallback for unknown component types", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Container", children: ["unknown1"] },
        { id: "unknown1", component: "NonExistentWidget" }
      ]
    });

    await expect(page.getByText("Unknown component: NonExistentWidget")).toBeVisible();

    const warnings = await getWarnings(page);
    const unknownWarning = (warnings as Array<{ code: string }>).find(
      (w) => w.code === "A2UI_UNKNOWN_COMPONENT"
    );
    expect(unknownWarning).toBeTruthy();
  });

  test("recovers from render errors via error boundary", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Container", children: ["ok", "bad"] },
        { id: "ok", component: "Text", text: "still here" },
        { id: "bad", component: "Boom" }
      ]
    });

    await expect(page.getByText("still here")).toBeVisible();
    await expect(page.getByText("Render failed: bad")).toBeVisible();
  });

  test("data model update triggers re-render of bound text", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "Text", text: { path: "/counter" } }
      ],
      data: [{ path: "/counter", value: "0" }]
    });

    await expect(page.getByText("0")).toBeVisible();

    await sendMessage(page, {
      version: "v0.9",
      updateDataModel: { surfaceId: "s1", path: "/counter", value: "42" }
    });

    await expect(page.getByText("42")).toBeVisible();
  });
});
