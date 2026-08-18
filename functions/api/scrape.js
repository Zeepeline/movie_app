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
  
  // TEMPORARY BYPASS: Log errors but don't block, to debug production issue
  let debugError = "";

  // 1. Keamanan Lapis 1: Cek Referer/Origin
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const isAllowedDomain = origin === '' || origin.includes('imintul.online') || origin.includes('.pages.dev');
  
  if (!isLocal && !isAllowedDomain) {
    debugError += "Invalid Origin: " + origin + ". ";
  }

  // 1.5. Keamanan Lapis 1.5: Verifikasi Dynamic JS Challenge
  const token = request.headers.get('X-Imintul-Token');
  if (!token) {
    debugError += "Missing Token. ";
  } else {
    try {
      const decoded = atob(token);
      const [tsStr, hashStr] = decoded.split('|');
      const ts = parseInt(tsStr, 10);
      const expectedHashStr = hashStr;

      const now = Date.now();
      if (Math.abs(now - ts) > 600000) {
        debugError += "Token Expired. ";
      } else {
        const salt = "imintul-magic-salt";
        const str = tsStr + salt;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }

        if (hash.toString() !== expectedHashStr) {
          debugError += "Invalid Token Signature. ";
        }
      }
    } catch (e) {
      debugError += "Token Decode Error. ";
    }
  }

  if (debugError !== "") {
    console.log("Scrape Security Warning:", debugError);
  }

  const tmdbId = url.searchParams.get('tmdbId');
  const type = url.searchParams.get('type') || 'movie';
  const season = url.searchParams.get('season') || '1';
  const episode = url.searchParams.get('episode') || '1';

  if (!tmdbId) {
    return new Response(JSON.stringify({ success: false, error: 'tmdbId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const targetUrl = `https://nebula.aether.cx/${type === 'tv' ? `tv/${tmdbId}/${season}/${episode}` : `movie/${tmdbId}`}?ser=tik`;
    
    // Header rahasia untuk menembus Cloudflare Aether
    const aetherHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://aether.cx/'
    };

    const response = await fetch(targetUrl, { headers: aetherHeaders });

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Stream not available for this title on Aether' 
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Aether API Error: ${response.status}` 
      }), {
        status: response.status,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const data = await response.json();
    
    if (data && data.success && data.streams && data.streams.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        sources: data.streams.map(s => ({
          url: s.url,
          isM3U8: s.type === 'hls' || s.url.includes('.m3u8'),
          quality: s.name || 'auto'
        }))
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Stream not found in API response' 
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
