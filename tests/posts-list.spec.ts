import { test, expect } from '@playwright/test';

test.describe('Posts list page', () => {
  const BASE_URL = '/';
  const POSTS_URL = '/posts';
  const API_URL = 'https://jsonplaceholder.typicode.com/posts';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: 'avatar' }).click();
    const loginButton = page.getByText('Login');

    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
  });

  test('should show posts list', async ({ page }) => {
    await page.route(`${API_URL}?_limit=1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ userId: 1, id: 1, title: 'Title 1', body: 'Body 1' }]),
      });
    });

    await page.route(`${API_URL}?_limit=3`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { userId: 1, id: 1, title: 'Title 1', body: 'Body 1' },
          { userId: 1, id: 2, title: 'Title 2', body: 'Body 2' },
          { userId: 1, id: 3, title: 'Title 3', body: 'Body 3' },
        ]),
      });
    });

    await page.route(`${API_URL}?_limit=5`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { userId: 1, id: 1, title: 'Title 1', body: 'Body 1' },
          { userId: 1, id: 2, title: 'Title 2', body: 'Body 2' },
          { userId: 1, id: 3, title: 'Title 3', body: 'Body 3' },
          { userId: 1, id: 4, title: 'Title 4', body: 'Body 4' },
          { userId: 1, id: 5, title: 'Title 5', body: 'Body 5' },
        ]),
      });
    });

    await page.goto(POSTS_URL);
    await expect(page).toHaveURL(POSTS_URL);

    await expect(page.locator('app-post')).toHaveCount(1);
    await expect(page.locator('app-post')).toHaveCount(3);
    await expect(page.locator('app-post')).toHaveCount(5);
  });

  test('should navigate to Post Details page', async ({ page }) => {
    await page.goto(POSTS_URL);
    await expect(page).toHaveURL(POSTS_URL);

    const firstPost = page.locator('app-post').first();
    await firstPost.waitFor({ state: 'visible', timeout: 2000 });
    firstPost.click();
    await expect(page).toHaveURL(/\/posts\/\d+/);

    const postDetails = page.locator('.post-details__body');

    await expect(postDetails).toBeVisible();
  });
});
