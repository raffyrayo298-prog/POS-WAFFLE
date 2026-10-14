const { test, expect } = require('@playwright/test');

test('admin and staff auth flows redirect correctly without looping', async ({ page }) => {
  const base = 'http://localhost:60355';

  await page.goto(base + '/login.html');
  await page.fill("input[name='email']", 'admin123@waffleking.com');
  await page.fill("input[name='password']", 'Admin123');
  await page.click('#submit-btn');
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/admin\.html$/);

  await page.click('#user-menu-btn');
  await page.click('#logout-btn');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/login\.html$/);

  const staffEmail = `stafftest${Date.now()}@example.com`;
  await page.goto(base + '/signup.html');
  await page.fill("input[name='name']", 'Staff Tester');
  await page.fill("input[name='email']", staffEmail);
  await page.fill("input[name='password']", 'Password123');
  await page.fill("input[name='confirm']", 'Password123');
  await page.click('#submit-btn');
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/app\.html$/);

  await page.click('#logout-btn');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/login\.html$/);

  await page.goto(base + '/admin-login.html');
  await page.fill("input[name='email']", 'admin123@waffleking.com');
  await page.fill("input[name='password']", 'Admin123');
  await page.click('#submit-btn');
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/admin\.html$/);

  await page.click('#logout-btn');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/login\.html$/);

  const adminEmail = `admintest${Date.now()}@example.com`;
  await page.goto(base + '/admin-signup.html');
  await page.fill("input[name='name']", 'Admin Tester');
  await page.fill("input[name='email']", adminEmail);
  await page.fill("input[name='password']", 'Password123');
  await page.fill("input[name='confirm']", 'Password123');
  await page.click('#submit-btn');
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/admin\.html$/);

  await page.goto(base + '/app.html');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/admin\.html$/);

  await page.goto(base + '/admin.html');
  await page.waitForTimeout(1200);
  await expect(page).toHaveURL(/admin\.html$/);
});
