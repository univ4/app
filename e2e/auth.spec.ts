import { expect, test } from "@playwright/test";

test.describe("Auth", () => {
  test("로그인 페이지 접근 시 로그인 폼 표시", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("이메일과 비밀번호로 로그인하세요.")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByLabel("이메일")).toBeVisible();
    await expect(page.getByLabel("비밀번호")).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });

  test("미인증 상태에서 /dashboard 접근 시 /login 리다이렉트", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
  });
});
