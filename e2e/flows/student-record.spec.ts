import { expect, test } from "../fixtures/auth";

test.describe("Student Record Flow", () => {
  test("세특 목록 표시 확인", async ({ page }) => {
    await page.goto("/dashboard/student-record");

    await page.getByRole("tab", { name: "세특" }).click();
    await expect(page.getByRole("tab", { name: "세특", selected: true })).toBeVisible();
    await expect(page.getByText(/등록된 세특이 없습니다|학년 [123]학기/)).toBeVisible();
  });

  test("행동특성 탭 접근", async ({ page }) => {
    await page.goto("/dashboard/student-record");

    await page.getByRole("tab", { name: "행동특성" }).click();
    await expect(page.getByRole("tab", { name: "행동특성", selected: true })).toBeVisible();
  });
});
