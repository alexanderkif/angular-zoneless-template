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
            avatarUrl: null,
            provider: 'local',
            emailVerified: true,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/api/posts?page=*&limit=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          posts: [
            {
              id: 'p1',
              title: 'Title 1',
              content: 'Body 1',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              author: {
                id: 'u1',
                name: 'Author',
                email: 'author@example.com',
                avatarUrl: null,
                role: 'user',
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        }),
      });
    });
  });

  test('should display navigation links', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.logo-link')).toBeVisible();
    await expect(page.locator('#nav-home')).toBeVisible();
    await expect(page.locator('#nav-posts')).toBeVisible();
    await expect(page.locator('#nav-about')).toBeVisible();
  });

  test('should navigate to Home page', async ({ page }) => {
    await page.goto(URL);
    await page.locator('#nav-home').click();
    await expect(page).toHaveURL(URL);
    await expect(
      page.getByRole('heading', { name: /Welcome to Angular 21(\.2)? Zoneless Template/ }),
    ).toBeVisible();
  });

  test('should navigate to About page', async ({ page }) => {
    await page.goto(URL);
    await page.locator('#nav-about').click();
    await expect(page).toHaveURL(`${URL}about`);
    await expect(page.getByRole('heading', { name: 'About This Project' })).toBeVisible();
  });

  test('should navigate to Posts List page', async ({ page }) => {
    await page.goto(URL);
    await page.locator('#nav-posts').click();
    await expect(page).toHaveURL(`${URL}posts`);

    await expect(page.getByRole('heading', { name: /Posts \(/ })).toBeVisible();
  });

  test('should display Page Not Found for invalid route', async ({ page }) => {
    await page.goto(`${URL}invalid-route`);
    await expect(page).toHaveURL(`${URL}invalid-route`);
    await expect(page.locator('.page-not-found')).toBeVisible();
  });
});
