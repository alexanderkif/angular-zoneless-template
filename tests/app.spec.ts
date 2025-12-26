import { test, expect } from '@playwright/test';

const URL = '/';

test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user API to simulate logged in state
    await page.route('**/api/user/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
          },
        }),
      });
    });
  });

  test('should display navigation links', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByLabel('Logo')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Posts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  });

  test('should navigate to Home page', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(URL);
    await expect(page.getByRole('heading', { name: 'Welcome to Angular Zoneless Template' })).toBeVisible();
  });

  test('should navigate to About page', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(`${URL}about`);
    await expect(page.getByRole('heading', { name: 'About This Project' })).toBeVisible();
  });

  test('should navigate to Posts List page', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('link', { name: 'Posts' }).click();
    await expect(page).toHaveURL(`${URL}posts`);

    await page.waitForResponse(
      (response) => response.url().includes('/posts?_limit=') && response.status() === 200
    );

    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('should display Page Not Found for invalid route', async ({ page }) => {
    await page.goto(`${URL}invalid-route`);
    await expect(page).toHaveURL(`${URL}invalid-route`);
    await expect(page.locator('.page-not-found')).toBeVisible();
  });
});
