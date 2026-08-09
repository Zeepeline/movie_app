export default {
  async fetch(request, env, ctx) {
    // Menangani Preflight (CORS Options)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    const url = new URL(request.url);
    const targetUrlStr = url.searchParams.get('url');
    const targetHeadersStr = url.searchParams.get('headers') || '{}';

    if (!targetUrlStr) {
      return new Response("No URL provided", { status: 400 });
    }

    try {
      let targetHeaders = {};
      try {
        targetHeaders = JSON.parse(targetHeadersStr);
      } catch (e) {}

      // Bersihkan pseudo-headers (Cloudflare Workers tidak memperbolehkannya)
      delete targetHeaders['host'];
      Object.keys(targetHeaders).forEach(key => {
        if (key.startsWith(':')) delete targetHeaders[key];
      });

      // Lakukan request ke server asli (CDN Bajakan)
      const targetResponse = await fetch(targetUrlStr, {
        method: request.method,
        headers: targetHeaders,
        redirect: 'follow'
      });

      const contentType = targetResponse.headers.get('content-type') || '';
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": contentType
      };

      // Jika file adalah daftar putar M3U8, kita harus mengubah tautan di dalamnya
      // agar diarahkan kembali ke Worker ini
      if (contentType.includes('mpegurl') || targetUrlStr.includes('.m3u8')) {
        const body = await targetResponse.text();
        const lines = body.split('\n');
        
        const rewrittenLines = lines.map(line => {
          const t = line.trim();
          if (t && !t.startsWith('#')) {
            const absoluteUrl = new URL(t, targetUrlStr).toString();
            // Arahkan kembali ke worker ini
            return `${url.origin}${url.pathname}?url=${encodeURIComponent(absoluteUrl)}&headers=${encodeURIComponent(targetHeadersStr)}`;
          }
          return line;
        });

        return new Response(rewrittenLines.join('\n'), {
          status: targetResponse.status,
          headers: corsHeaders
        });
      }

      // Jika file biner (.ts / .mp4), langsung teruskan data streamingnya (piping)
      return new Response(targetResponse.body, {
        status: targetResponse.status,
        headers: corsHeaders
      });

    } catch (e) {
      return new Response(`Worker Proxy Error: ${e.message}`, { status: 500 });
    }
  }
};
