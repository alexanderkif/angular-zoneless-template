import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const URL = '/';

setup('authenticate', async ({ page }) => {
  // Mock the login API
  await page.route('**/api/auth/login', async (route) => {
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

  // Mock the user API (called after login)
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

  await page.context().addCookies([
    {
      name: 'access_token',
      value: 'fake_token',
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.goto(URL);

  // Verify we are logged in (Posts link enabled)
  await expect(page.locator('#nav-posts')).not.toHaveClass('disabled-link');
  await page.context().storageState({ path: authFile });
});
