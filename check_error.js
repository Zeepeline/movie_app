import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log('HTML CONTENT:', html.trim());
  } catch (e) {
    console.log('Failed to load page:', e.message);
  }
  
  await browser.close();
})();
