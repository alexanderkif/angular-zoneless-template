import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  const URL = '/';

  test('should display navigation links', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByText('logo')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Posts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'About' })).toBeVisible();
  });

  test('should navigate to Home page', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(URL);
    await expect(page.getByRole('heading', { name: 'Main content' })).toBeVisible();
  });

  test('should navigate to About page', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(`${URL}about`);
    await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  });

  test('should not navigate to Posts List page without logging in', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'avatar' }).click();
    const exitButton = page.getByText('Exit');

    if (await exitButton.isVisible()) {
      await exitButton.click();
    }
    await page.getByRole('listitem').filter({ hasText: 'Posts' }).click();
    await expect(page).toHaveURL(URL);
  });

  test('should navigate to Posts List page', async ({ page }) => {
    await page.goto(URL);
    await page.getByRole('button', { name: 'avatar' }).click();
    const loginButton = page.getByText('Login');

    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
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
