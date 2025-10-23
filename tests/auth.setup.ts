import { test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const URL = '/';

setup('authenticate', async ({ page }) => {
  await page.goto(URL);
  await page.getByRole('button', { name: 'avatar' }).click();

  const loginButton = page.getByText('Login');

  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  await page.context().storageState({ path: authFile });
});