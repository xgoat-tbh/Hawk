import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Outcast/.gemini/antigravity/brain/ee2fd59a-a6b8-423e-b53f-1cbb1c697fee';
const BASE_URL = 'http://localhost:3000';
const GUILD_ID = '1517584175677308998';
const TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

async function runTests() {
  console.log('🚀 Starting Puppeteer E2E UI Test Suite...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Set session cookie
  await page.setCookie({
    name: 'hawk_session',
    value: TOKEN,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
  });

  const results = {
    overviewScrollable: false,
    sidebarUsername: '',
    sidebarToggleWorks: false,
    themeToggleWorks: false,
    modulePagesLoaded: [],
  };

  try {
    // ----------------------------------------------------
    // Test 1: Overview Page Load & Viewport Non-Scrollable
    // ----------------------------------------------------
    console.log(`\nTesting Overview page at ${BASE_URL}/dashboard/${GUILD_ID}...`);
    await page.goto(`${BASE_URL}/dashboard/${GUILD_ID}`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for loading screen to finish and dashboard shell to mount
    await page.waitForSelector('aside', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_overview_dark.png') });
    console.log('📸 Captured e2e_overview_dark.png');

    const scrollMetrics = await page.evaluate(() => {
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const bodyHeight = document.body.scrollHeight;
      return {
        docHeight,
        winHeight,
        bodyHeight,
        isDocNonScrollable: docHeight <= winHeight,
        isBodyNonScrollable: bodyHeight <= winHeight,
      };
    });

    console.log('Document Scroll Metrics at 1920x1080:', scrollMetrics);
    results.overviewScrollable = !scrollMetrics.isDocNonScrollable;

    // ----------------------------------------------------
    // Test 2: Sidebar User Display
    // ----------------------------------------------------
    console.log('\nTesting Sidebar User Display...');
    const userDisplay = await page.evaluate(() => {
      const asideText = document.querySelector('aside')?.innerText || '';
      return {
        asideText,
        hasAaryan: asideText.includes('Aaryan'),
        hasHandle: asideText.includes('@Aaryan') || asideText.includes('@'),
      };
    });
    console.log('Sidebar user text check:', userDisplay);
    results.sidebarUsername = userDisplay.hasAaryan ? 'Aaryan' : 'Unknown';

    // ----------------------------------------------------
    // Test 3: Sidebar Collapsible Rail Toggle
    // ----------------------------------------------------
    console.log('\nTesting Sidebar Collapse & Expand...');
    const initialWidth = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      return aside ? aside.getBoundingClientRect().width : null;
    });
    console.log('Initial sidebar width:', initialWidth);

    const toggleBtn = await page.$('[data-testid="sidebar-toggle"]');
    if (toggleBtn) {
      await toggleBtn.click();
      await new Promise((r) => setTimeout(r, 500));

      const collapsedWidth = await page.evaluate(() => {
        const aside = document.querySelector('aside');
        return aside ? aside.getBoundingClientRect().width : null;
      });
      console.log('Collapsed sidebar width:', collapsedWidth);

      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_sidebar_collapsed.png') });
      console.log('📸 Captured e2e_sidebar_collapsed.png');

      // Expand back
      await toggleBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      const expandedWidth = await page.evaluate(() => {
        const aside = document.querySelector('aside');
        return aside ? aside.getBoundingClientRect().width : null;
      });
      console.log('Restored sidebar width:', expandedWidth);

      results.sidebarToggleWorks = collapsedWidth < initialWidth && expandedWidth > collapsedWidth;
    } else {
      console.warn('⚠️ Sidebar toggle button not found!');
    }

    // ----------------------------------------------------
    // Test 4: Theme Toggle (Dark <-> Light Mode)
    // ----------------------------------------------------
    console.log('\nTesting Theme Toggle (Dark to Light)...');
    const themeBtn = await page.$('button[aria-label="Toggle theme"], header button:has(svg.lucide-sun), header button:has(svg.lucide-moon)');
    if (themeBtn) {
      await themeBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_overview_light.png') });
      console.log('📸 Captured e2e_overview_light.png');
      results.themeToggleWorks = true;
    } else {
      console.warn('⚠️ Theme toggle button not found!');
    }

    // ----------------------------------------------------
    // Test 5: Module Pages Dual-Theme Smoke Tests
    // ----------------------------------------------------
    const testModules = [
      { name: 'economy', path: `/dashboard/${GUILD_ID}/economy` },
      { name: 'permissions', path: `/dashboard/${GUILD_ID}/permissions` },
      { name: 'welcome', path: `/dashboard/${GUILD_ID}/welcome` },
      { name: 'general', path: `/dashboard/${GUILD_ID}/general` },
    ];

    for (const mod of testModules) {
      console.log(`\nNavigating to ${mod.name} page: ${BASE_URL}${mod.path}...`);
      await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('aside', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 600));

      await page.screenshot({ path: path.join(ARTIFACT_DIR, `e2e_${mod.name}_light.png`) });
      console.log(`📸 Captured e2e_${mod.name}_light.png`);

      // Switch to dark mode
      const modThemeBtn = await page.$('button[aria-label="Toggle theme"], header button:has(svg.lucide-sun), header button:has(svg.lucide-moon)');
      if (modThemeBtn) {
        await modThemeBtn.click();
        await new Promise((r) => setTimeout(r, 500));
        await page.screenshot({ path: path.join(ARTIFACT_DIR, `e2e_${mod.name}_dark.png`) });
        console.log(`📸 Captured e2e_${mod.name}_dark.png`);
        // Switch back to light for next test
        await modThemeBtn.click();
        await new Promise((r) => setTimeout(r, 500));
      }
      results.modulePagesLoaded.push(mod.name);
    }

    console.log('\n======================================');
    console.log('✅ ALL E2E PUPPETEER TESTS COMPLETED');
    console.log('Results Summary:', JSON.stringify(results, null, 2));
    console.log('======================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await browser.close();
  }
}

runTests();
