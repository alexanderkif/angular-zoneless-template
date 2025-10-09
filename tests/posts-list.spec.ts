import { test, expect } from '@playwright/test';

test.describe('Posts list page', () => {
  const url = '/posts';
  const apiUrl = 'https://jsonplaceholder.typicode.com/posts';

  test('should show posts list', async ({ page }) => {
    await page.route(`${apiUrl}?_limit=1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ userId: 1, id: 1, title: 'Title 1', body: 'Body 1' }]),
      });
    });

    await page.route(`${apiUrl}?_limit=3`, async (route) => {
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

    await page.route(`${apiUrl}?_limit=5`, async (route) => {
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

    await page.goto(url);
    await expect(page).toHaveURL(url);

    await expect(page.locator('app-post')).toHaveCount(1);
    await expect(page.locator('app-post')).toHaveCount(3);
    await expect(page.locator('app-post')).toHaveCount(5);
  });

  test('should navigate to Post Details page', async ({ page }) => {
    await page.goto(url);
    await expect(page).toHaveURL(url);

    const firstPost = page.locator('app-post').first();
    await firstPost.waitFor({ state: 'visible', timeout: 2000 });
    firstPost.click();
    await expect(page).toHaveURL(/\/posts\/\d+/);

    const postDetails = page.locator('.post-details__body');

    await expect(postDetails).toBeVisible();
  });
});
