import { expect, test } from "./fixtures/auth";

test.describe("Student Record", () => {
  test("/dashboard/student-record 접근 시 9개 탭 표시", async ({ page }) => {
    await page.goto("/dashboard/student-record");

    await expect(page.getByRole("heading", { name: "생활기록부" })).toBeVisible();

    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(9);
    await expect(page.getByRole("tab", { name: "세특" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "학교폭력" })).toBeVisible();
  });

  test("세특 탭 클릭 시 세특 목록 표시", async ({ page }) => {
    await page.goto("/dashboard/student-record");

    await expect(page.getByRole("tab", { name: "세특" })).toBeVisible();
    await page.getByRole("tab", { name: "세특" }).click();
    await expect(
      page.getByText(/등록된 세특이 없습니다\.|학년 [12]학기|학년 [123]학기/),
    ).toBeVisible();
  });
});
