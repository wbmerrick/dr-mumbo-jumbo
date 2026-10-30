// Renders the case-B denial letter to a PNG, then degrades it the way a phone photo
// of a printed page looks (slight tilt, uneven light, sensor noise, JPEG), and finally
// applies the same downscale + JPEG 0.8 step the Fight Pack client performs in-browser.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const dir = path.resolve(__dirname, 'corpus');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(dir, 'B-inpatient-loc-letter.html'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, 'B-letter-clean.png'), fullPage: true });
  await browser.close();
  console.log('clean render written');
})();
