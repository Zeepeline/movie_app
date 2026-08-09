export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  try {
    // 1. Ambil HTML asli dari server bajakan
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        // Palsukan referer agar mereka mengira kita mengakses dari domain mereka sendiri
        'Referer': new URL(targetUrl).origin
      }
    });

    let html = await response.text();

    // 2. Suntikkan "Racun Adblocker" ke dalam HTML mereka
    // Skrip ini akan melumpuhkan fungsi-fungsi yang sering dipakai untuk membuka iklan pop-under
    const injectionScript = `
      <script>
        // Lumpuhkan window.open
        window.open = function() { console.log('Adblock Proxy: window.open blocked'); return null; };
        
        // Hapus semua event klik yang tersembunyi di atas layar
        document.addEventListener('DOMContentLoaded', () => {
          const killAds = () => {
            const iframes = document.getElementsByTagName('iframe');
            for (let i = 0; i < iframes.length; i++) {
              if (iframes[i].src.includes('ads') || iframes[i].src.includes('exoclick')) {
                iframes[i].remove();
              }
            }
          };
          setInterval(killAds, 1000);
          
          // Tangkap dan batalkan klik liar
          document.addEventListener('click', (e) => {
            // Jika klik mengarah ke link luar, batalkan
            if(e.target.tagName === 'A' && !e.target.href.includes(location.origin)) {
              e.preventDefault();
              e.stopPropagation();
              console.log('Adblock Proxy: Outbound click blocked');
            }
          }, true);
        });
      </script>
    `;

    // Masukkan skrip kita tepat setelah tag <head>
    html = html.replace('<head>', '<head>' + injectionScript);

    // 3. Kembalikan HTML yang sudah "jinak" ke Svelte kita
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
