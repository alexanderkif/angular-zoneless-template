import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  const url = '/';

  test('should display navigation links', async ({ page }) => {
    await page.goto(url);
    await expect(page.getByText('logo')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Posts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  });

  test('should navigate to Home page', async ({ page }) => {
    await page.goto(url);
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { name: 'Main content' })).toBeVisible();
  });

  test('should navigate to About page', async ({ page }) => {
    await page.goto(url);
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(`${url}about`);
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  });

  test('should navigate to Posts List page', async ({ page }) => {
    await page.goto(url);
    await page.getByRole('link', { name: 'Posts' }).click();
    await expect(page).toHaveURL(`${url}posts`);

    await page.waitForResponse(
      (response) => response.url().includes('/posts?_limit=') && response.status() === 200
    );

    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('should display Page Not Found for invalid route', async ({ page }) => {
    await page.goto(`${url}invalid-route`);
    await expect(page).toHaveURL(`${url}invalid-route`);
    await expect(page.locator('.page-not-found')).toBeVisible();
  });
});
