const puppeteer = require('D:/AgentFuse/frontend/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(r => setTimeout(r, ms));

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const axeSource = fs.readFileSync('D:/AgentFuse/frontend/node_modules/axe-core/axe.min.js', 'utf8');
const outDir = 'D:/AgentFuse/docs/images';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('--- STARTING PHASE 5 VERIFICATION AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });

  const consoleErrors = [];
  const axeReports = {};

  const setupPage = async (page) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore favicon or benign 404s if any
        consoleErrors.push({ url: page.url(), text });
      }
    });
    page.on('pageerror', err => {
      consoleErrors.push({ url: page.url(), text: err.toString() });
    });
  };

  const authSession = async (page) => {
    await page.evaluate(() => {
      sessionStorage.setItem('agentfuse_api_key', 'af_live_admin_prod_corp_001');
      sessionStorage.setItem('agentfuse_role', 'ADMIN');
    });
  };

  const runAxe = async (page, name) => {
    await page.evaluate(axeSource);
    const results = await page.evaluate(async () => {
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        }
      });
    });
    const seriousOrCritical = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    axeReports[name] = {
      total: results.violations.length,
      seriousOrCritical: seriousOrCritical.length,
      violations: seriousOrCritical.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map(n => ({ target: n.target, html: n.html }))
      }))
    };
    return seriousOrCritical;
  };

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    console.log(`\nCapturing screens at ${vp.name}...`);
    const page = await browser.newPage();
    await setupPage(page);
    await page.setViewport({ width: vp.width, height: vp.height });

    // 1. Marketing Site
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
    await delay(600);
    await page.screenshot({ path: path.join(outDir, `site-hero-${vp.name}.png`) });

    // Axe on Landing Page (at desktop viewport)
    if (vp.name === '1440x900') {
      await runAxe(page, 'Landing Page');
    }

    // Capture sections on site
    const sections = [
      { id: 'section-01', name: 'site-01-fleet' },
      { id: 'section-02', name: 'site-02-why-tripped' },
      { id: 'section-03', name: 'site-03-recovery' },
      { id: 'section-04', name: 'site-04-calculator' },
      { id: 'section-05', name: 'site-05-quickstart' },
      { id: 'section-comparison', name: 'site-comparison' },
      { id: 'section-faq', name: 'site-faq' }
    ];

    for (const sec of sections) {
      const el = await page.$(`#${sec.id}`) || await page.$(`[data-section="${sec.id}"]`);
      if (el) {
        await el.screenshot({ path: path.join(outDir, `${sec.name}-${vp.name}.png`) });
      }
    }
    // Full landing page
    await page.screenshot({ path: path.join(outDir, `site-full-${vp.name}.png`), fullPage: true });

    // 2. Dashboard - Fleet
    await page.goto('http://127.0.0.1:5173/fleet', { waitUntil: 'domcontentloaded' });
    await authSession(page);
    await page.goto('http://127.0.0.1:5173/fleet', { waitUntil: 'domcontentloaded' });
    await delay(800);
    await page.screenshot({ path: path.join(outDir, `fleet-${vp.name}.png`) });
    if (vp.name === '1440x900') {
      await runAxe(page, 'Fleet');
    }

    // 3. Dashboard - Incident Queue & Detail
    await page.goto('http://127.0.0.1:5173/incidents', { waitUntil: 'domcontentloaded' });
    await delay(800);
    await page.screenshot({ path: path.join(outDir, `incident-queue-${vp.name}.png`) });

    // Select first incident if available
    const incidentRow = await page.$('button[data-incident-id], [data-incident-item]');
    if (incidentRow) {
      await incidentRow.click();
      await delay(600);
    }
    await page.screenshot({ path: path.join(outDir, `incident-detail-${vp.name}.png`) });
    if (vp.name === '1440x900') {
      await runAxe(page, 'Incident Detail');
    }

    // 4. Dashboard - Settings
    await page.goto('http://127.0.0.1:5173/settings', { waitUntil: 'domcontentloaded' });
    await delay(600);
    await page.screenshot({ path: path.join(outDir, `settings-${vp.name}.png`) });
    if (vp.name === '1440x900') {
      await runAxe(page, 'Settings');
    }

    // 5. Dashboard - Queues
    await page.goto('http://127.0.0.1:5173/queues', { waitUntil: 'domcontentloaded' });
    await delay(600);
    await page.screenshot({ path: path.join(outDir, `queues-${vp.name}.png`) });

    await page.close();
  }

  // Keyboard navigation approve flow test
  console.log('\nTesting keyboard-only approve flow...');
  const kbdPage = await browser.newPage();
  await setupPage(kbdPage);
  await kbdPage.setViewport({ width: 1440, height: 900 });
  await kbdPage.goto('http://127.0.0.1:5173/incidents', { waitUntil: 'domcontentloaded' });
  await authSession(kbdPage);
  await kbdPage.goto('http://127.0.0.1:5173/incidents', { waitUntil: 'domcontentloaded' });
  await delay(800);

  // Keyboard navigation: press 'j' to navigate down, 'k' to navigate up, 'a' to open approve dialog
  await kbdPage.keyboard.press('j');
  await delay(200);
  await kbdPage.keyboard.press('j');
  await delay(200);
  await kbdPage.keyboard.press('a');
  await delay(400);

  // Check if confirm dialog appeared
  const dialogVisible = await kbdPage.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return !!dialog;
  });
  console.log('Approve Dialog opened via keyboard ("a"):', dialogVisible ? 'PASSED' : 'FAILED');

  if (dialogVisible) {
    await kbdPage.screenshot({ path: path.join(outDir, 'keyboard-approve-dialog.png') });
    // Press Escape to cancel
    await kbdPage.keyboard.press('Escape');
  }
  await kbdPage.close();

  await browser.close();

  console.log('\n--- AUDIT SUMMARY ---');
  console.log('Console errors encountered:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log(consoleErrors);
  }
  console.log('\naxe-core results (serious / critical violations):');
  for (const [screen, report] of Object.entries(axeReports)) {
    console.log(`- ${screen}: ${report.seriousOrCritical} serious/critical (total: ${report.total})`);
    if (report.seriousOrCritical > 0) {
      console.log('  Violations:', JSON.stringify(report.violations, null, 2));
    }
  }

  const screenshots = fs.readdirSync(outDir);
  console.log(`\nGenerated ${screenshots.length} screenshots in docs/images:`);
  screenshots.forEach(s => console.log(`  - ${s}`));
}

run().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
