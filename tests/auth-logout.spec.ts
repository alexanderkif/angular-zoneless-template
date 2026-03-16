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

    // For type="email" in Chromium + Angular Signal Forms: each character typed via
    // pressSequentially triggers an Angular CD cycle that calls element.value = signalValue,
    // resetting the cursor to position 0. The next keystroke then replaces all content.
    // Fix: set value + dispatch input event atomically in a single JS evaluation so the
    // signal updates synchronously before any CD cycle can run and reset the cursor.
    const emailInput = page.getByTestId('login-email');
    await emailInput.focus();
    await emailInput.evaluate((el) => {
      (el as HTMLInputElement).value = 'test@example.com';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await emailInput.press('Tab');
    await page.getByTestId('login-password').fill('password123');
    await page.getByTestId('login-password').press('Tab');

    // app-button uses display:contents — the disabled state is on the inner <button>,
    // not on the host element. Target the inner button for a reliable enabled check.
    const submitBtn = page.getByTestId('login-submit').locator('button');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });

    const loginResponse = page.waitForResponse('**/api/auth/login');
    await submitBtn.click();
    await loginResponse;

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
