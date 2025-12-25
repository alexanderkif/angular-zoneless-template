import { test, expect } from '@playwright/test';

const URL = '/posts';
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

test.describe('Posts list page', () => {
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

    await page.goto('/');
  });

  test('should show posts list', async ({ page }) => {
    // First load: 3 posts
    await page.route(`${API_URL}?_limit=3&_start=0`, async (route) => {
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

    // Second load: 3 posts starting from index 3
    await page.route(`${API_URL}?_limit=3&_start=3`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { userId: 1, id: 4, title: 'Title 4', body: 'Body 4' },
          { userId: 1, id: 5, title: 'Title 5', body: 'Body 5' },
          { userId: 1, id: 6, title: 'Title 6', body: 'Body 6' },
        ]),
      });
    });

    // Navigate to posts page via UI click (after reload with localStorage set)
    await page.getByRole('link', { name: 'Posts' }).click();
    await expect(page).toHaveURL(URL);

    await expect(page.locator('app-post')).toHaveCount(3);
    
    // Click Load More
    await page.getByRole('button', { name: 'Load More' }).click();
    await expect(page.locator('app-post')).toHaveCount(6);
  });

  test('should navigate to Post Details page', async ({ page }) => {
    // Navigate to posts page via UI click (after reload with localStorage set)
    await page.getByRole('link', { name: 'Posts' }).click();
    await expect(page).toHaveURL(URL);

    const firstPost = page.locator('app-post').first();
    await firstPost.waitFor({ state: 'visible', timeout: 20000 });
    await firstPost.click();
    await expect(page).toHaveURL(/\/posts\/\d+/);

    const postDetails = page.locator('.post-details__body');

    await expect(postDetails).toBeVisible();
  });
});
