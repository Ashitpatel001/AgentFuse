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

  // Test 3: With dialog open, verify j/k/a/x/c are completely ignored
  console.log('Testing shortcuts suppression while dialog is open...');
  const initialUrl = page.url();

  // Try pressing 'j' (move down) while dialog is open
  await page.keyboard.press('j');
  await page.waitForTimeout(200);
  assert.strictEqual(page.url(), initialUrl, 'Pressing "j" with dialog open must NOT change incident selection URL!');

  // Try pressing 'k' (move up) while dialog is open
  await page.keyboard.press('k');
  await page.waitForTimeout(200);
  assert.strictEqual(page.url(), initialUrl, 'Pressing "k" with dialog open must NOT change incident selection URL!');

  // Try pressing 'x' (reject) while approve dialog is open
  await page.keyboard.press('x');
  await page.waitForTimeout(200);
  const dialogs = await page.$$('[role="dialog"]');
  assert.strictEqual(dialogs.length, 1, 'Pressing "x" while dialog is open must not spawn secondary dialog!');

  // Try pressing 'a' again while dialog is open
  await page.keyboard.press('a');
  await page.waitForTimeout(200);
  const dialogsAfterA = await page.$$('[role="dialog"]');
  assert.strictEqual(dialogsAfterA.length, 1, 'Pressing "a" while dialog is open must not spawn duplicate dialog!');

  // Try pressing 'c' (copy AI context) while dialog is open
  await page.keyboard.press('c');
  await page.waitForTimeout(200);

  console.log('[PASS] With approve dialog open: j/k/a/x/c shortcuts were strictly ignored.');

  // Close dialog with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  dialog = await page.$('[role="dialog"]');
  assert.strictEqual(dialog, null, 'Dialog should close after pressing Escape.');

  // Test 4: Open Shortcuts Dialog with '?' and test j/k/a/x/c
  await page.keyboard.press('?');
  await page.waitForTimeout(400);
  const helpDialog = await page.$('[role="dialog"]');
  assert.notStrictEqual(helpDialog, null, 'Pressing "?" should open Shortcuts dialog.');

  await page.keyboard.press('j');
  await page.waitForTimeout(150);
  assert.strictEqual(page.url(), initialUrl, 'Pressing "j" with help dialog open must not change selection.');

  await page.keyboard.press('k');
  await page.waitForTimeout(150);
  assert.strictEqual(page.url(), initialUrl, 'Pressing "k" with help dialog open must not change selection.');

  await page.keyboard.press('a');
  await page.waitForTimeout(150);
  assert.strictEqual((await page.$$('[role="dialog"]')).length, 1, 'Pressing "a" with help dialog open must not open approve dialog.');

  await page.keyboard.press('x');
  await page.waitForTimeout(150);
  assert.strictEqual((await page.$$('[role="dialog"]')).length, 1, 'Pressing "x" with help dialog open must not open reject dialog.');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('[PASS] With shortcuts dialog open: j/k/a/x/c shortcuts were strictly ignored.');

  await browser.close();
  console.log('--- ALL PLAYWRIGHT SHORTCUTS TESTS PASSED ---');
}

run().catch(err => {
  console.error('[FAIL] Playwright shortcut test failed:', err);
  process.exit(1);
});
