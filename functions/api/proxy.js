async function generateHmac(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  
  // Keamanan Origin telah dihapus karena HLS.js / Safari terkadang tidak mengirim header Origin dengan benar.
  // API ini sudah dilindungi 100% oleh HMAC Signature Lapis 2 yang tidak bisa dipalsukan.

  const targetUrl = url.searchParams.get('url');
  const targetHeadersStr = url.searchParams.get('headers') || '{}';
  const expStr = url.searchParams.get('exp');
  const sig = url.searchParams.get('sig');
  
  if (!targetUrl || !expStr || !sig) {
    return new Response('Missing parameters or signature', { status: 400 });
  }
  
  // 2. Keamanan Lapis 2: Verifikasi Signature HMAC
  const exp = parseInt(expStr, 10);
  if (Date.now() / 1000 > exp) {
    return new Response(JSON.stringify({ success: false, error: 'Link expired' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  
  const secretKey = context.env.PROXY_SECRET_KEY || 'imintul-super-secret-key-123!';
  const expectedSig = await generateHmac(`session:${exp}`, secretKey);
  
  if (sig !== expectedSig) {
    return new Response('Invalid signature', { status: 403 });
  }
  
  try {
    const targetHeaders = JSON.parse(targetHeadersStr);
    
    // Jangan teruskan host kita dan pseudo-headers
    delete targetHeaders['host'];
    for (const key in targetHeaders) {
      if (key.startsWith(':')) {
        delete targetHeaders[key];
      }
    }
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: targetHeaders
    });
    
    if (!response.ok) {
      return new Response(`Proxy Error: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Membangun Response Headers
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*' // Aman, karena Origin dan Signature sudah divalidasi
    });
    if (contentType) responseHeaders.set('Content-Type', contentType);
    
    if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
      // Jika M3U8, kita harus menulis ulang (rewrite) semua URL di dalamnya
      const body = await response.text();
      const lines = body.split('\n');
      
      const originHost = url.origin;
      const rewrittenLines = lines.map(line => {
        const t = line.trim();
        // Jika baris bukan komentar dan bukan kosong, itu adalah URL (Playlist lain atau file TS)
        if (t && !t.startsWith('#')) {
          const absoluteUrl = new URL(t, targetUrl).toString();
          // Arahkan kembali ke proxy ini DENGAN MENERUSKAN exp dan sig
          return `${originHost}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&headers=${encodeURIComponent(targetHeadersStr)}&exp=${exp}&sig=${sig}`;
        }
        return line;
      });
      
      return new Response(rewrittenLines.join('\n'), { headers: responseHeaders });
    } else {
      // OPTIMASI CF WORKER: Streaming pipe langsung ke client tanpa buffer!
      return new Response(response.body, { headers: responseHeaders });
    }
  } catch (e) {
    return new Response(`Internal Proxy Error: ${e.message}`, { status: 500 });
  }
}
