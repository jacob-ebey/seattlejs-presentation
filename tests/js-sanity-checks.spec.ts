import { test, expect } from "@playwright/test";

test("demo starting point", async ({ page }) => {
  await page.goto("http://localhost:8000/");

  await test.step("has critical data", async () => {
    const critical = await page.waitForSelector("#critical");
    await critical.waitForSelector(
      "text=I'm critical data that blocked the initial render of the page."
    );
  });

  await test.step("has slow data", async () => {
    const slow = await page.waitForSelector("#slow");
    await slow.waitForSelector(
      "text=I'm slow data that DID block the initial render of the page."
    );
  });
});

test("finished demo", async ({ page, context }) => {
  await page.goto("http://localhost:8001/");

  await test.step("has critical data", async () => {
    const critical = await page.waitForSelector("#critical");
    await expect(await critical.textContent()).toEqual(
      "I'm critical data that blocked the initial render of the page."
    );
  });

  await test.step("has slow data fallback", async () => {
    const slow = await page.waitForSelector("#slow");
    await slow.waitForSelector(
      "text=I'm slow data that did NOT block the initial render of the page."
    );
  });
});
