const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => pageErrors.push('PAGEERROR: ' + error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push('CONSOLE: ' + msg.text());
    }
  });
  page.on('requestfailed', (req) => {
    consoleErrors.push('REQUESTFAILED: ' + req.url() + ' :: ' + (req.failure()?.errorText || 'unknown'));
  });

  try {
    await page.goto('http://localhost:8080/login.html', { waitUntil: 'networkidle' });
    console.log('LOGIN_PAGE_TITLE=' + await page.title());
    console.log('LOGIN_PAGE_URL=' + page.url());

    await page.fill("input[name='email']", 'testuser' + Date.now() + '@example.com');
    await page.fill("input[name='password']", 'Password123');
    await page.click('#submit-btn');
    await page.waitForTimeout(2000);
    console.log('AFTER_LOGIN_URL=' + page.url());

    await page.goto('http://localhost:8080/admin-login.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('ADMIN_LOGIN_URL=' + page.url());

    await page.goto('http://localhost:8080/admin.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('ADMIN_PAGE_URL=' + page.url());

    await page.goto('http://localhost:8080/app.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('APP_PAGE_URL=' + page.url());
  } catch (err) {
    console.log('NAVIGATION_ERROR=' + err.message);
  }

  console.log('PAGE_ERRORS=' + (pageErrors.length ? pageErrors.join(' | ') : 'NONE')); 
  console.log('CONSOLE_ERRORS=' + (consoleErrors.length ? consoleErrors.slice(0, 20).join(' | ') : 'NONE'));

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
