import { test, expect } from '@playwright/test';

const URL = '/posts';
const API_URL = 'https://jsonplaceholder.typicode.com/posts';

test.describe('Posts list page', () => {
  test.beforeEach(async ({ page }) => {
    // Go to home page first, then set localStorage, then reload
    await page.goto('/');
    
    // Set authenticated user in localStorage via evaluate
    await page.evaluate(() => {
      const user = {
        id: 1,
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        address: {
          street: 'Kulas Light',
          suite: 'Apt. 556',
          city: 'Gwenborough',
          zipcode: '92998-3874',
          geo: { lat: '-37.3159', lng: '81.1496' }
        },
        phone: '1-770-736-8031 x56442',
        website: 'hildegard.org',
        company: {
          name: 'Romaguera-Crona',
          catchPhrase: 'Multi-layered client-server neural-net',
          bs: 'harness real-time e-markets'
        }
      };
      localStorage.setItem('user', JSON.stringify(user));
    });
    
    // Reload page to trigger NgRx effect to load user from localStorage
    await page.reload();
  });

  test('should show posts list', async ({ page }) => {
    // First load: 1 post
    await page.route(`${API_URL}?_limit=1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ userId: 1, id: 1, title: 'Title 1', body: 'Body 1' }]),
      });
    });

    // Second load: 2 posts starting from index 1
    await page.route(`${API_URL}?_start=1&_limit=2`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { userId: 1, id: 2, title: 'Title 2', body: 'Body 2' },
          { userId: 1, id: 3, title: 'Title 3', body: 'Body 3' },
        ]),
      });
    });

    // Third load: 2 posts starting from index 3
    await page.route(`${API_URL}?_start=3&_limit=2`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { userId: 1, id: 4, title: 'Title 4', body: 'Body 4' },
          { userId: 1, id: 5, title: 'Title 5', body: 'Body 5' },
        ]),
      });
    });

    // Navigate to posts page via UI click (after reload with localStorage set)
    await page.getByRole('link', { name: 'Posts' }).click();
    await expect(page).toHaveURL(URL);

    await expect(page.locator('app-post')).toHaveCount(1);
    await expect(page.locator('app-post')).toHaveCount(3);
    await expect(page.locator('app-post')).toHaveCount(5);
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
