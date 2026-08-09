self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const reqUrl = new URL(event.request.url);

  // 1. Blokir URL iklan yang umum dipakai player bajakan
  const adDomains = ['popunder', 'ads', 'exoclick', 'propeller', 'onclick', 'adsterra', 'monetag'];
  if (adDomains.some(domain => reqUrl.hostname.includes(domain))) {
    event.respondWith(new Response('', { status: 403 }));
    return;
  }

  // 2. Intercept request awal HTML iframe
  if (reqUrl.pathname.startsWith('/adblock-proxy')) {
    const proxyUrl = `/api/proxy-iframe?url=${encodeURIComponent(reqUrl.searchParams.get('url'))}`;
    event.respondWith(fetch(proxyUrl, {
      method: event.request.method,
      headers: event.request.headers
    }));
    return;
  }

  // 3. Intercept permintaan jaringan DARI dalam Iframe kita
  const referer = event.request.referrer;
  if (referer && referer.includes('/adblock-proxy?url=')) {
    // Jangan loop permintaan proxy
    if (reqUrl.pathname.startsWith('/api/proxy-iframe')) {
      return;
    }

    try {
      const targetBase = new URL(new URL(referer).searchParams.get('url')).origin;
      let realUrl = event.request.url;
      
      // Jika iframe mencoba load file relatif (misal /assets/js/player.js), arahkan ke domain aslinya
      if (reqUrl.origin === self.location.origin) {
         realUrl = targetBase + reqUrl.pathname + reqUrl.search;
      }
      
      const realUrlObj = new URL(realUrl);
      // Proxy HANYA jika request menuju domain utama player (untuk hindari CORS).
      // Biarkan request ke CDN video langsung lewat agar tidak membebani Cloudflare Worker
      if (realUrlObj.origin === targetBase) {
        const proxyUrl = `/api/proxy-iframe?url=${encodeURIComponent(realUrl)}`;
        event.respondWith(fetch(proxyUrl, {
          method: event.request.method,
          headers: event.request.headers
        }));
        return;
      }
    } catch(e) {
      console.error("SW Proxy Error:", e);
    }
  }
});
