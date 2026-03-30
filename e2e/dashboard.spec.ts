import { expect, test } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("/dashboard 접근 시 주요 카드 표시", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByTestId("card-signals")).toBeVisible();
    await expect(page.getByTestId("card-calendar")).toBeVisible();
    await expect(page.getByTestId("card-chat")).toBeVisible();
    await expect(page.getByTestId("card-simulator")).toBeVisible();
  });

  test("/dashboard/signals 렌더링", async ({ page }) => {
    await page.goto("/dashboard/signals");
    await expect(page.getByTestId("signals-page")).toBeVisible();
  });

  test("/dashboard/calendar 렌더링", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await expect(page.getByTestId("calendar-page")).toBeVisible();
  });

  test("/dashboard/chat 렌더링", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await expect(page.getByTestId("chat-page")).toBeVisible();
  });
});
