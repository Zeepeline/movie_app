export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');
  const targetHeadersStr = url.searchParams.get('headers') || '{}';
  
  if (!targetUrl) {
    return new Response('No URL provided', { status: 400 });
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
      'Access-Control-Allow-Origin': '*'
    });
    if (contentType) responseHeaders.set('Content-Type', contentType);
    
    if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
      // Jika M3U8, kita harus menulis ulang (rewrite) semua URL di dalamnya
      const body = await response.text();
      const lines = body.split('\n');
      
      const origin = url.origin;
      const rewrittenLines = lines.map(line => {
        const t = line.trim();
        // Jika baris bukan komentar dan bukan kosong, itu adalah URL (Playlist lain atau file TS)
        if (t && !t.startsWith('#')) {
          const absoluteUrl = new URL(t, targetUrl).toString();
          // Arahkan kembali ke proxy ini
          return `${origin}/api/proxy?url=${encodeURIComponent(absoluteUrl)}&headers=${encodeURIComponent(targetHeadersStr)}`;
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
