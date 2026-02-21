import type { Page } from "@playwright/test";

/**
 * Send an A2UI message via the exposed window.__A2UI_API__.
 * Also manages the surface renderer list for create/delete messages.
 */
export async function sendMessage(page: Page, message: unknown): Promise<void> {
  await page.evaluate((msg) => {
    const m = msg as Record<string, unknown>;

    // If creating a surface, register it with the renderer
    if (m.createSurface) {
      const payload = m.createSurface as { surfaceId: string };
      window.__addSurface__(payload.surfaceId);
    }

    // Process the protocol message
    window.__A2UI_API__!.processMessage(msg);

    // If deleting a surface, remove it from the renderer
    if (m.deleteSurface) {
      const payload = m.deleteSurface as { surfaceId: string };
      window.__removeSurface__(payload.surfaceId);
    }
  }, message);
}

/**
 * Wait for the API to be available on the page.
 */
export async function waitForApi(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__A2UI_API__ !== null);
}

/**
 * Create a surface and optionally add components + data in one go.
 */
export async function createSurface(
  page: Page,
  surfaceId: string,
  options?: {
    components?: unknown[];
    data?: Array<{ path: string; value: unknown }>;
  }
): Promise<void> {
  await sendMessage(page, {
    version: "v0.9",
    createSurface: { surfaceId }
  });

  if (options?.components) {
    await sendMessage(page, {
      version: "v0.9",
      updateComponents: { surfaceId, components: options.components }
    });
  }

  if (options?.data) {
    for (const { path, value } of options.data) {
      await sendMessage(page, {
        version: "v0.9",
        updateDataModel: { surfaceId, path, value }
      });
    }
  }
}

/**
 * Get captured actions from the test harness.
 */
export async function getActions(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__A2UI_ACTIONS__);
}

/**
 * Get captured errors from the test harness.
 */
export async function getErrors(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__A2UI_ERRORS__);
}

/**
 * Get captured warnings from the test harness.
 */
export async function getWarnings(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__A2UI_WARNINGS__);
}

/**
 * Get captured host effects from the test harness.
 */
export async function getHostEffects(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__A2UI_HOST_EFFECTS__);
}

/**
 * Clear all captured callbacks.
 */
export async function clearCaptures(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__A2UI_ACTIONS__ = [];
    window.__A2UI_ERRORS__ = [];
    window.__A2UI_WARNINGS__ = [];
    window.__A2UI_HOST_EFFECTS__ = [];
  });
}
