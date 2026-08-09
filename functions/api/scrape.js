export async function onRequest(context) {
  const url = new URL(context.request.url);
  const tmdbId = url.searchParams.get('tmdbId');
  const type = url.searchParams.get('type');

  if (!tmdbId) {
    return new Response(JSON.stringify({ success: false, error: 'tmdbId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const targetUrl = `https://link.aether.cx/${type === 'tv' ? 'tv' : 'movie'}/${tmdbId}`;
    
    // Header rahasia untuk menembus Cloudflare Aether
    const aetherHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://aether.bar/'
    };

    const response = await fetch(targetUrl, { headers: aetherHeaders });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Aether Ghost API Error: ${response.status}. Body: ${errorText.substring(0, 500)}`);
    }

    const data = await response.json();
    
    if (data && data.stream) {
      const streamUrl = data.stream;
      const encodedHeaders = encodeURIComponent(JSON.stringify(aetherHeaders));
      
      // Arahkan ke Cloudflare Function proxy milik kita sendiri
      // Kita menggunakan context.request.url untuk membangun base URL yang benar
      const origin = new URL(context.request.url).origin;
      const proxyUrl = `${origin}/api/proxy?url=${encodeURIComponent(streamUrl)}&headers=${encodedHeaders}`;
      
      return new Response(JSON.stringify({
        success: true,
        sources: [
          {
            url: proxyUrl, 
            isM3U8: streamUrl.includes('m3u8'),
            quality: 'auto'
          }
        ]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Stream not found in API response' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
