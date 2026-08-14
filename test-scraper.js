import puppeteer from 'puppeteer-core';

const executablePath = process.platform === 'darwin' 
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');

(async () => {
  console.log("Memulai browser...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio']
  });

  const page = await browser.newPage();
  let streamUrl = null;

  page.on('request', request => {
    const url = request.url();
    if (url.includes('.m3u8') || url.includes('.mp4') || url.includes('api') || url.includes('aether') || url.includes('link')) {
      console.log("REQ:", request.method(), url);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('api') || url.includes('link') || url.includes('aether') || url.includes('m3u8')) {
      console.log("RES:", res.status(), url);
      try {
        if (res.headers()['content-type']?.includes('json')) {
          console.log("BODY:", (await res.text()).substring(0, 300));
        }
      } catch(e) {}
    }
  });

  console.log("Membuka halaman aether.bar...");
  await page.goto("https://aether.bar/media/tmdb-movie-969681-spider-man-brand-new-day", { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
})();
