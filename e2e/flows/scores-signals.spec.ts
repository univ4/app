import { expect, test } from "../fixtures/auth";

test.describe("Scores to Signals Flow", () => {
  test("성적 입력 후 신호등 페이지에서 결과 표시", async ({ page }) => {
    await page.goto("/dashboard/scores");

    await page.getByRole("tab", { name: "모의고사" }).click();
    await expect(page.getByText("국어 표준점수")).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" }).first()).toBeVisible();

    await page.goto("/dashboard/signals");

    await expect(page.locator("h1").filter({ hasText: "합격 가능성 신호등" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "신호등 · 확률" })).toBeVisible();
    await expect(page.getByRole("button", { name: "전체 대학 스캔" })).toBeVisible();
  });
});
