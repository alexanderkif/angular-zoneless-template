import { expect, test } from '@playwright/test';

test.describe('Auth logout flow', () => {
  test('logout should invalidate session even with remember me and stay logged out after refresh', async ({
    page,
  }) => {
    let isLoggedIn = false;

    const userPayload = {
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        provider: 'local',
        emailVerified: true,
        role: 'user',
      },
    };

    await page.route('**/api/user/me', async (route) => {
      if (isLoggedIn) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(userPayload),
        });
        return;
      }

      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    await page.route('**/api/auth/login', async (route) => {
      isLoggedIn = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(userPayload),
      });
    });

    await page.route('**/api/auth/logout', async (route) => {
      isLoggedIn = false;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' }),
      });
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid refresh token' }),
      });
    });

    await page.goto('/login');

    const rememberMeCheckbox = page.getByTestId('login-remember-me');
    await expect(rememberMeCheckbox).toBeChecked();

    await page.getByTestId('login-email').fill('test@example.com');
    await page.getByTestId('login-password').fill('password123');

    await Promise.all([
      page.waitForResponse('**/api/auth/login'),
      page.getByTestId('login-submit').click(),
    ]);

    await expect(page).toHaveURL('/');

    await page.getByTestId('user-menu-toggle').click();
    await expect(page.getByTestId('user-menu-logout')).toBeVisible();

    await Promise.all([
      page.waitForResponse('**/api/auth/logout'),
      page.getByTestId('user-menu-logout').click(),
    ]);

    await expect(page).toHaveURL('/');

    await page.getByTestId('user-menu-toggle').click();
    await expect(page.getByTestId('user-menu-login')).toBeVisible();

    await page.reload();

    await page.getByTestId('user-menu-toggle').click();
    await expect(page.getByTestId('user-menu-login')).toBeVisible();
  });
});
