import { expect, test } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("/dashboard 접근 시 주요 카드 표시", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("합격 신호등")).toBeVisible();
    await expect(page.getByText("입시 캘린더").first()).toBeVisible();
    await expect(page.getByText("AI 요강 챗봇")).toBeVisible();
    await expect(page.getByText("원서 배분 시뮬레이터")).toBeVisible();
  });

  test("/dashboard/signals 렌더링", async ({ page }) => {
    await page.goto("/dashboard/signals");
    await expect(
      page.locator("h1").filter({ hasText: "합격 가능성 신호등" }),
    ).toBeVisible();
  });

  test("/dashboard/calendar 렌더링", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await expect(page.getByRole("heading", { name: "입시 D-Day 캘린더" })).toBeVisible();
  });

  test("/dashboard/chat 렌더링", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await expect(page.getByRole("heading", { name: "AI 요강 챗봇" })).toBeVisible();
  });
});
