import { expect, test } from "@playwright/test";
import { createSurface, sendMessage, waitForApi } from "./helpers";

test.describe("Data binding", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
  });

  test("reads data from model via path", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "BindingProbe", path: "/name", nextValue: "ignored" }
      ],
      data: [{ path: "/name", value: "Alice" }]
    });

    const probe = page.getByTestId("binding-probe");
    await expect(probe).toHaveText("Alice");
  });

  test("writes data back via setValue on click", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "BindingProbe", path: "/count", nextValue: 99 }
      ],
      data: [{ path: "/count", value: 1 }]
    });

    const probe = page.getByTestId("binding-probe");
    await expect(probe).toHaveText("1");

    await probe.click();
    await expect(probe).toHaveText("99");
  });

  test("data model updates trigger re-render of bound component", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "BindingProbe", path: "/status", nextValue: "done" }
      ],
      data: [{ path: "/status", value: "loading" }]
    });

    const probe = page.getByTestId("binding-probe");
    await expect(probe).toHaveText("loading");

    await sendMessage(page, {
      version: "v0.9",
      updateDataModel: { surfaceId: "s1", path: "/status", value: "ready" }
    });

    await expect(probe).toHaveText("ready");
  });

  test("nested path resolution works", async ({ page }) => {
    await createSurface(page, "s1", {
      components: [
        { id: "root", component: "BindingProbe", path: "/user/profile/name", nextValue: "Bob" }
      ],
      data: [{ path: "/user", value: { profile: { name: "DeepValue" } } }]
    });

    const probe = page.getByTestId("binding-probe");
    await expect(probe).toHaveText("DeepValue");
  });
});
