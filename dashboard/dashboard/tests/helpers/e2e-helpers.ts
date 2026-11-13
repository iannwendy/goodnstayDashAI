import { expect, type APIRequestContext, type Page } from "@playwright/test";

export function attachErrorMonitor(
  page: Page,
  options?: { ignoreNetAbort?: boolean },
): {
  errors: string[];
  assertZeroErrors: () => void;
} {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        options?.ignoreNetAbort &&
        text.includes("Failed to load resource: net::ERR_FAILED")
      ) {
        return;
      }
      errors.push(`[console.error] ${text}`);
    }
  });
  return {
    errors,
    assertZeroErrors: () => {
      expect(
        errors,
        `Unexpected browser console/page errors:\n${errors.join("\n")}`,
      ).toEqual([]);
    },
  };
}

export async function resetSeedViaApi(request: APIRequestContext): Promise<void> {
  const res = await request.post("/api/master-data/reset");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.ok).toBe(true);
}

export async function gotoFreshSeedDashboard(
  page: Page,
  request: APIRequestContext,
): Promise<void> {
  await resetSeedViaApi(request);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();
}

export async function assertNoHorizontalOverflow(
  page: Page,
  contextLabel: string,
): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      {
        message: `Horizontal overflow detected (${contextLabel})`,
        timeout: 5_000,
      },
    )
    .toBe(true);
}
