import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// Helper function untuk HMAC di environment Node.js
async function generateHmac(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Buffer.from(signature).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Vite plugin untuk menangani /api saat development lokal tanpa wrangler
function localApiDevPlugin() {
  return {
    name: 'local-api-dev-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5173'}`);
        const pathname = parsedUrl.pathname;

        try {
          if (pathname === '/api/scrape') {
            const tmdbId = parsedUrl.searchParams.get('tmdbId');
            const type = parsedUrl.searchParams.get('type') || 'movie';
            const season = parsedUrl.searchParams.get('season') || '1';
            const episode = parsedUrl.searchParams.get('episode') || '1';

            if (!tmdbId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: 'tmdbId required' }));
            }

            // 1. Prioritas Utama: Cinejoy Direct Extractor (Ultra HD 4K / 1080p m3u8)
            try {
              const puppeteer = await import('puppeteer-core');
              const executablePath = process.platform === 'darwin'
                ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                : (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : '/usr/bin/google-chrome');

              const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio'] });
              const page = await browser.newPage();
              
              await page.setRequestInterception(true);
              page.on('request', req => {
                const rt = req.resourceType();
                if (['image', 'stylesheet', 'font'].includes(rt)) req.abort();
                else req.continue();
              });

              let cinejoyM3u8: string | null = null;
              page.on('request', req => {
                const u = req.url();
                if (u.includes('movieboxnoob.cc') && (u.includes('playlist') || u.includes('master') || u.includes('video_1080p') || u.includes('.m3u8')) && !u.includes('audio')) {
                  if (!cinejoyM3u8 || u.includes('playlist') || u.includes('video_1080p')) {
                    cinejoyM3u8 = u;
                  }
                }
              });

              const cinejoyTargetUrl = type === 'tv'
                ? `https://cinejoy.to/watch/tv/${tmdbId}/${season}/${episode}`
                : `https://cinejoy.to/watch/movie/${tmdbId}`;

              await page.goto(cinejoyTargetUrl, { waitUntil: 'networkidle2', timeout: 15000 });

              for (let i = 0; i < 30; i++) {
                if (cinejoyM3u8) break;
                await new Promise(r => setTimeout(r, 200));
              }
              await browser.close();

              if (cinejoyM3u8) {
                const secretKey = 'imintul-super-secret-key-123!';
                const exp = Math.floor(Date.now() / 1000) + 86400;
                const sig = await generateHmac(`session:${exp}`, secretKey);
                const originHost = `http://${req.headers.host || 'localhost:5173'}`;

                const proxyHeaders = JSON.stringify({
                  'Referer': 'https://cinejoy.to/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                });

                const proxiedUrl = `${originHost}/api/proxy?url=${encodeURIComponent(cinejoyM3u8)}&headers=${encodeURIComponent(proxyHeaders)}&exp=${exp}&sig=${sig}`;

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                return res.end(JSON.stringify({
                  success: true,
                  sources: [{
                    url: proxiedUrl,
                    isM3U8: true,
                    quality: 'Cinejoy 4K/1080p'
                  }]
                }));
              }
            } catch (cineErr) {
              console.warn("Cinejoy extraction error:", cineErr);
            }

            // 2. Fallback: Aether Nebula API
            try {
              const aetherTargetUrl = `https://nebula.aether.cx/${type === 'tv' ? `tv/${tmdbId}/${season}/${episode}` : `movie/${tmdbId}`}?ser=tik`;
              const aetherRes = await fetch(aetherTargetUrl, {
                headers: {
                  'Referer': 'https://aether.cx/',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              });

              if (aetherRes.ok) {
                const data: any = await aetherRes.json();
                if (data && data.success && data.streams && data.streams.length > 0) {
                  const secretKey = 'imintul-super-secret-key-123!';
                  const exp = Math.floor(Date.now() / 1000) + 86400;
                  const sig = await generateHmac(`session:${exp}`, secretKey);
                  const originHost = `http://${req.headers.host || 'localhost:5173'}`;

                  const proxyHeaders = JSON.stringify({
                    'Referer': 'https://aether.cx/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  });

                  const verifiedStreams: any[] = [];
                  for (const s of data.streams) {
                    try {
                      const check = await fetch(s.url, { 
                        method: 'HEAD',
                        headers: { 'Referer': 'https://aether.cx/' } 
                      });
                      if (check.ok) verifiedStreams.push(s);
                    } catch(e) {}
                  }

                  const finalStreams = verifiedStreams.length > 0 ? verifiedStreams : data.streams;
                  if (finalStreams && finalStreams.length > 0) {
                    const proxiedSources = finalStreams.map((s: any) => ({
                      url: `${originHost}/api/proxy?url=${encodeURIComponent(s.url)}&headers=${encodeURIComponent(proxyHeaders)}&exp=${exp}&sig=${sig}`,
                      isM3U8: s.type === 'hls' || s.url.includes('.m3u8'),
                      quality: s.name || 'auto'
                    }));

                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    return res.end(JSON.stringify({ success: true, sources: proxiedSources }));
                  }
                }
              }
            } catch (aetherErr) {
              console.warn("Aether error:", aetherErr);
            }

            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.end(JSON.stringify({ success: false, error: 'Stream not found' }));
          }

          if (pathname === '/api/proxy') {
            const targetUrl = parsedUrl.searchParams.get('url');
            const targetHeadersStr = parsedUrl.searchParams.get('headers') || '{}';
            const expStr = parsedUrl.searchParams.get('exp');
            const sig = parsedUrl.searchParams.get('sig');

            if (!targetUrl || !expStr || !sig) {
              res.statusCode = 400;
              return res.end('Missing parameters or signature');
            }

            const exp = parseInt(expStr, 10);
            if (Date.now() / 1000 > exp) {
              res.statusCode = 403;
              return res.end('Link expired');
            }

            const secretKey = 'imintul-super-secret-key-123!';
            const expectedSig = await generateHmac(`session:${exp}`, secretKey);
            if (sig !== expectedSig) {
              res.statusCode = 403;
              return res.end('Invalid signature');
            }

            const targetHeaders = JSON.parse(targetHeadersStr);
            delete targetHeaders['host'];

            const proxyRes = await fetch(targetUrl, { headers: targetHeaders });
            if (!proxyRes.ok) {
              res.statusCode = proxyRes.status;
              return res.end(`Proxy Error: ${proxyRes.statusText}`);
            }

            const contentType = proxyRes.headers.get('content-type') || '';
            res.setHeader('Access-Control-Allow-Origin', '*');
            if (contentType) res.setHeader('Content-Type', contentType);

            if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
              const body = await proxyRes.text();
              const lines = body.split('\n');
              const originHost = `http://${req.headers.host || 'localhost:5173'}`;
              const rewritten = lines.map(line => {
                const t = line.trim();
                if (t && !t.startsWith('#')) {
                  const absoluteUrl = new URL(t, targetUrl).toString();
                  return `${originHost}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&headers=${encodeURIComponent(targetHeadersStr)}&exp=${exp}&sig=${sig}`;
                }
                return line;
              }).join('\n');
              return res.end(rewritten);
            } else {
              const arrayBuffer = await proxyRes.arrayBuffer();
              return res.end(Buffer.from(arrayBuffer));
            }
          }

          if (pathname === '/api/proxy-iframe') {
            const targetUrl = parsedUrl.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              return res.end('Missing target URL');
            }

            const iframeRes = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': new URL(targetUrl).origin
              }
            });

            let html = await iframeRes.text();
            const targetOrigin = new URL(targetUrl).origin;
            const injection = `<base href="${targetOrigin}/" /><script>window.open=function(){return null;};</script>`;
            html = html.replace('<head>', '<head>' + injection);

            res.setHeader('Content-Type', 'text/html;charset=UTF-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.end(html);
          }

          next();
        } catch (err: any) {
          console.error("Local API Dev Error:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    localApiDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Irmintul Movie',
        short_name: 'Irmintul',
        description: 'Irmintul Movie - Movie & TV Series Streaming Tracker',
        theme_color: '#0b0f19',
        background_color: '#0b0f19',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
