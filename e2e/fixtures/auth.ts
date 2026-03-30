import fs from "node:fs/promises";
import path from "node:path";

import { expect, test as base } from "@playwright/test";

const AUTH_DIR = path.join(process.cwd(), "playwright", ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");

async function ensureStorageState() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
}

type AuthFixtures = {
  storageStatePath: string;
};

export const test = base.extend<AuthFixtures>({
  storageStatePath: async ({ browser }, applyFixture) => {
    await ensureStorageState();

    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    if (!email || !password) {
      throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD must be set.");
    }

    const setupContext = await browser.newContext({
      baseURL: "http://localhost:3000",
    });
    const setupPage = await setupContext.newPage();

    await setupPage.goto("/login");
    await setupPage.getByLabel("이메일").fill(email);
    await setupPage.getByLabel("비밀번호").fill(password);
    await setupPage.getByRole("button", { name: "로그인" }).click();
    await setupPage.waitForURL("**/dashboard");
    await expect(setupPage).toHaveURL(/\/dashboard$/);

    await setupContext.storageState({ path: AUTH_FILE });
    await setupContext.close();

    await applyFixture(AUTH_FILE);
  },

  storageState: async ({ storageStatePath }, applyFixture) => {
    await applyFixture(storageStatePath);
  },
});

export { expect };
