import { expect, test } from "./fixtures/auth";

test.describe("Dashboard", () => {
  test("/dashboard 접근 시 주요 카드 표시", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: /합격 가능성 신호등 입결 기반으로 안정·적정·도전을 빠르게 확인합니다\./ })).toBeVisible();
    await expect(page.getByRole("link", { name: /입시 캘린더 가족 일정과 D-Day를 한눈에 관리합니다\./ })).toBeVisible();
    await expect(page.getByRole("link", { name: /AI 요강 챗봇 대학 전형계획과 정시 자료를 근거로 질의응답합니다\./ })).toBeVisible();
    await expect(page.getByRole("link", { name: /원서 배분 시뮬레이터 수시 6장 포트폴리오 리스크를 시뮬레이션합니다\./ })).toBeVisible();
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
