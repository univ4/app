import { expect, test } from "../fixtures/auth";

test.describe("Simulator Flow", () => {
  test("시뮬레이터 페이지 접근 및 기본 UI 표시", async ({ page }) => {
    await page.goto("/dashboard/simulator");

    await expect(page.getByRole("heading", { name: "원서 배분 시뮬레이터" })).toBeVisible();
    await expect(page.getByText("현재 카드 (0/6)")).toBeVisible();
    await expect(page.getByText("포트폴리오 분석 (§9.1)")).toBeVisible();
  });
});
