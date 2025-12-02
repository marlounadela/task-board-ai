import { test, expect } from "@playwright/test";

test("create and drag task", async ({ page }) => {
  await page.goto("/board/test-board-id");
  
  await page.getByRole("button", { name: /add task/i }).click();
  await page.getByLabel(/title/i).fill("New Task");
  await page.getByRole("button", { name: /create/i }).click();
  
  await expect(page.getByText("New Task")).toBeVisible();
});
