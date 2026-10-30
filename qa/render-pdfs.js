// Renders the case-J denial letter and records excerpt to PDF, the form a patient's family
// usually has them in (a portal download or a scan saved as PDF).
// Usage: node render-pdfs.js
const { chromium } = require('playwright');
const path = require('path');
const dir = path.resolve(__dirname, 'corpus');
const JOBS = [['J-irf-denial-letter.html', 'J-irf-denial-letter.pdf'], ['J-records.html', 'J-records.pdf']];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [src, out] of JOBS) {
    await page.goto('file://' + path.join(dir, src));
    await page.pdf({ path: path.join(dir, out), format: 'Letter', printBackground: true, margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' } });
    console.log('wrote', out);
  }
  await browser.close();
})();
