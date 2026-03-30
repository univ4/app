import { expect, test } from "../fixtures/auth";

test.describe("Chat Flow", () => {
  test("챗봇 페이지 질문 입력 UI 표시", async ({ page }) => {
    await page.goto("/dashboard/chat");

    await expect(page.getByLabel("챗봇 질문 입력")).toBeVisible();
    await expect(page.getByLabel("대학 (요강 스코프)")).toBeVisible();
    await expect(page.getByText("잘 맞는 질문 예시 (매뉴얼 §12)")).toBeVisible();
  });

  test("챗봇 대학 필터 선택", async ({ page }) => {
    await page.goto("/dashboard/chat");

    const univFilter = page.getByLabel("대학 (요강 스코프)");
    await univFilter.selectOption("성균관대");
    await expect(univFilter).toHaveValue("성균관대");
  });
});
