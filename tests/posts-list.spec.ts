import { test, expect } from '@playwright/test';

const URL = '/posts';

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
            avatarUrl: null,
            provider: 'local',
            emailVerified: true,
            role: 'user',
          },
        }),
      });
    });

    // Page 1 response
    await page.route('**/api/posts?page=1&limit=3', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: '1',
              title: 'Title 1',
              content: 'Body 1',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              author: {
                id: 'a1',
                name: 'Author 1',
                email: 'author1@example.com',
                avatarUrl: null,
                role: 'user',
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 3,
            total: 2,
            totalPages: 2,
            hasNext: true,
            hasPrev: false,
          },
        }),
      });
    });

    // Page 2 response
    await page.route('**/api/posts?page=2&limit=3', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: '2',
              title: 'Title 2',
              content: 'Body 2',
              createdAt: '2026-01-02T00:00:00.000Z',
              updatedAt: '2026-01-02T00:00:00.000Z',
              author: {
                id: 'a2',
                name: 'Author 2',
                email: 'author2@example.com',
                avatarUrl: null,
                role: 'user',
              },
            },
          ],
          pagination: {
            page: 2,
            limit: 3,
            total: 2,
            totalPages: 2,
            hasNext: false,
            hasPrev: true,
          },
        }),
      });
    });

    await page.route('**/api/posts/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          post: {
            id: '1',
            title: 'Title 1',
            content: 'Body 1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            author: {
              id: 'a1',
              name: 'Author 1',
              email: 'author1@example.com',
              avatarUrl: null,
              role: 'user',
            },
          },
          comments: [],
        }),
      });
    });

    await page.goto('/');
  });

  test('should show posts list', async ({ page }) => {
    // Navigate to posts page via UI click
    await page.locator('#nav-posts').click();
    await expect(page).toHaveURL(URL);

    await expect(page.locator('app-post')).toHaveCount(1);
    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    await page.locator('#posts-next-page').click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(page.getByText('Title 2')).toBeVisible();
  });

  test('should navigate to Post Details page', async ({ page }) => {
    // Navigate to posts page via UI click
    await page.locator('#nav-posts').click();
    await expect(page).toHaveURL(URL);

    const detailsButton = page.getByRole('button', { name: 'View details for Title 1' });
    await detailsButton.waitFor({ state: 'visible', timeout: 20000 });
    await detailsButton.click();
    await expect(page).toHaveURL(/\/posts\/1/);

    await expect(page.getByRole('link', { name: /back to posts/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comments (0)' })).toBeVisible();
  });
});
