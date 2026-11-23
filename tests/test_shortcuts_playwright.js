const { chromium } = require('D:/AgentFuse/frontend/node_modules/playwright');
const assert = require('assert');

async function run() {
  console.log('--- RUNNING PLAYWRIGHT SHORTCUTS FOCUS GUARD TEST ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  
  // Inject session credentials before any document or script loads
  await context.addInitScript(() => {
    sessionStorage.setItem('agentfuse_api_key', 'af_live_admin_prod_corp_001');
    sessionStorage.setItem('agentfuse_role', 'ADMIN');
  });

  const page = await context.newPage();

  // 1. Navigate to incidents queue
  await page.goto('http://127.0.0.1:5173/incidents', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Wait for search input to be visible
  const searchInput = await page.waitForSelector('input[placeholder*="Filter"]');
  assert(searchInput, 'Search input should exist');

  // Select an incident first so pressing "a" would normally approve
  const incidentItem = await page.waitForSelector('button[data-incident-id], [data-incident-item]');
  if (incidentItem) {
    await incidentItem.click();
  }
  await page.waitForTimeout(400);

  // Focus the text field
  await searchInput.focus();
  console.log('Focused search input element');

  // Type "a" into the text field
  await page.keyboard.type('a');
  console.log('Typed "a" in text field');
  await page.waitForTimeout(300);

  // Confirm value in input is "a"
  const inputValue = await searchInput.inputValue();
  assert.strictEqual(inputValue, 'a', 'Input should receive character "a"');

  // Confirm NO approve dialog opened
  let dialog = await page.$('[role="dialog"]');
  assert.strictEqual(dialog, null, 'CRITICAL: No approve dialog should open when typing "a" in text input!');
  console.log('[PASS] Focus in input: typing "a" did NOT open approve dialog.');

  // Test 2: Unfocus input, press "a", verify dialog opens
  await searchInput.evaluate(el => el.blur());
  await page.waitForTimeout(200);

  // Press "a" with focus NOT in input
  await page.keyboard.press('a');
  await page.waitForTimeout(400);

  dialog = await page.$('[role="dialog"]');
  assert.notStrictEqual(dialog, null, 'Approve dialog SHOULD open when "a" is pressed outside text field.');
  console.log('[PASS] Focus outside input: pressing "a" successfully opens approve dialog.');

  // Clean up dialog with Escape
  await page.keyboard.press('Escape');

  await browser.close();
  console.log('--- ALL PLAYWRIGHT SHORTCUTS TESTS PASSED ---');
}

run().catch(err => {
  console.error('[FAIL] Playwright shortcut test failed:', err);
  process.exit(1);
});
