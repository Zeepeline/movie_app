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
    if (url.includes('.m3u8') || url.includes('.mp4')) {
      if (!url.includes('blank.mp4') && !url.includes('ads') && !streamUrl) {
        streamUrl = url;
        console.log("DITEMUKAN:", url);
      }
    }
  });

  console.log("Membuka halaman aether.bar...");
  await page.goto("https://aether.bar/media/tmdb-movie-969681-spider-man-brand-new-day", { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForSelector('iframe, video, .play, #play', { timeout: 3000 });
    await page.mouse.click(500, 300);
  } catch(e) {}

  for (let i = 0; i < 40; i++) {
    if (streamUrl) break;
    await new Promise(r => setTimeout(r, 250));
  }
  
  if (!streamUrl) console.log("Gagal mendapatkan M3U8");
  await browser.close();
})();
