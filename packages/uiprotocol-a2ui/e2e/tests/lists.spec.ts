import { expect, test } from "@playwright/test";
import { createSurface, sendMessage, waitForApi } from "./helpers";

test.describe("List rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
  });

  test("renders template-based list items", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ListProbe",
          itemsPath: "/items",
          template: { child: "itemText" }
        },
        {
          id: "itemText",
          component: "Text",
          text: { path: "./name" }
        }
      ],
      data: [
        { path: "/items", value: [{ name: "Alpha" }, { name: "Beta" }, { name: "Gamma" }] }
      ]
    });

    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta")).toBeVisible();
    await expect(page.getByText("Gamma")).toBeVisible();
  });

  test("list items use scoped data binding", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ListProbe",
          itemsPath: "/people",
          template: { child: "personName" }
        },
        {
          id: "personName",
          component: "Text",
          text: { path: "./displayName" }
        }
      ],
      data: [
        { path: "/people", value: [{ displayName: "Alice" }, { displayName: "Bob" }] }
      ]
    });

    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
  });

  test("list re-renders when data model updates", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ListProbe",
          itemsPath: "/items",
          template: { child: "itemLabel" }
        },
        {
          id: "itemLabel",
          component: "Text",
          text: { path: "./label" }
        }
      ],
      data: [
        { path: "/items", value: [{ label: "First" }] }
      ]
    });

    await expect(page.getByText("First")).toBeVisible();

    // Update to add a second item
    await sendMessage(page, {
      version: "v0.9",
      updateDataModel: {
        surfaceId: "s1",
        path: "/items",
        value: [{ label: "First" }, { label: "Second" }]
      }
    });

    await expect(page.getByText("First")).toBeVisible();
    await expect(page.getByText("Second")).toBeVisible();
  });

  test("renders nothing when no items or template", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        {
          id: "root",
          component: "ListProbe",
          itemsPath: "/items"
          // No template
        }
      ],
      data: [{ path: "/items", value: [{ name: "Should not render" }] }]
    });

    // The list probe should not render any list items
    await expect(page.getByText("Should not render")).not.toBeVisible();
  });
});
