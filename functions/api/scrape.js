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
  
  // 1. Keamanan Lapis 1: Cek Referer/Origin
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
  const isAllowedDomain = origin.includes('imintul.online') || origin.includes('.pages.dev');
  
  if (!isLocal && !isAllowedDomain) {
    return new Response(JSON.stringify({ success: false, error: 'Access Denied: Invalid Origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 1.5. Keamanan Lapis 1.5: Verifikasi Dynamic JS Challenge
  const token = request.headers.get('X-Imintul-Token');
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Access Denied: Missing Challenge Token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const decoded = atob(token);
    const [tsStr, hashStr] = decoded.split('|');
    const ts = parseInt(tsStr, 10);
    const expectedHashStr = hashStr;

    // Cek apakah timestamp valid (tidak lebih tua dari 2 menit / 120000ms)
    // dan tidak lebih dari masa depan
    const now = Date.now();
    if (Math.abs(now - ts) > 120000) {
      return new Response(JSON.stringify({ success: false, error: 'Access Denied: Token Expired' }), { status: 403 });
    }

    // Hitung ulang hash
    const salt = "imintul-magic-salt";
    const str = tsStr + salt;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }

    if (hash.toString() !== expectedHashStr) {
      return new Response(JSON.stringify({ success: false, error: 'Access Denied: Invalid Challenge Signature' }), { status: 403 });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Access Denied: Malformed Token' }), { status: 403 });
  }

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
      
      // 2. Keamanan Lapis 2: Buat Token HMAC untuk mencegah pencurian URL Proxy
      // URL hanya berlaku selama 6 jam (6 * 3600 detik)
      const exp = Math.floor(Date.now() / 1000) + (6 * 3600);
      const secretKey = context.env.PROXY_SECRET_KEY || 'imintul-super-secret-key-123!';
      
      // Yang kita tandatangani adalah 'session' + waktu kedaluwarsa
      // Kita tidak menandatangani streamUrl karena di dalam playlist M3U8 ada ribuan URL nested
      // yang akan memakan waktu terlalu lama jika harus ditandatangani satu per satu.
      const messageToSign = `session:${exp}`;
      const signature = await generateHmac(messageToSign, secretKey);
      
      // Arahkan ke Cloudflare Function proxy milik kita sendiri
      const originUrl = url.origin;
      const proxyUrl = `${originUrl}/api/proxy?url=${encodeURIComponent(streamUrl)}&headers=${encodedHeaders}&exp=${exp}&sig=${signature}`;
      
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
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Bolehkan '*' karena Origin sudah kita validasi secara manual di atas
        }
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
