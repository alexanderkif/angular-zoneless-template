import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const URL = '/';

setup('authenticate', async ({ page }) => {
  await page.goto(URL);
  await page.getByRole('button', { name: 'avatar' }).click();
  await page.getByText('Login').click();

  await expect(page.getByRole('link', { name: 'Posts' })).not.toHaveClass('disabled-link');
  await page.context().storageState({ path: authFile });
});