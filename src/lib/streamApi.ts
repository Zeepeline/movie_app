import type { StreamSource, Subtitle, StreamData } from '../types/stream';

// Fungsi untuk menghasilkan token tantangan anti-scraping
function generateChallengeToken(): string {
  const ts = Date.now().toString();
  const salt = "imintul-magic-salt";
  const str = ts + salt;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  return btoa(ts + "|" + hash.toString());
}

export async function getStreamLinks(
  tmdbId: string | number,
  type: string = "movie",
  season?: number,
  episode?: number,
): Promise<StreamData | null> {
  console.log("getStreamLinks called with:", tmdbId, type, season, episode);
  try {
    // 1. Coba request langsung ke Aether Nebula API (CORS enabled & multi-stream)
    try {
      const aetherTargetUrl = `https://nebula.aether.cx/${type === "tv" ? `tv/${tmdbId}/${season || 1}/${episode || 1}` : `movie/${tmdbId}`}`;
      const aetherRes = await fetch(aetherTargetUrl, {
        headers: {
          'Referer': 'https://aether.bar/'
        }
      });
      
      if (aetherRes.ok) {
        const aetherData = await aetherRes.json();
        if (aetherData && aetherData.success && aetherData.streams && aetherData.streams.length > 0) {
          const sources: StreamSource[] = aetherData.streams.map((s: any) => ({
            url: s.url,
            isM3U8: s.type === 'hls' || s.url.includes('.m3u8'),
            quality: s.name || 'Auto'
          }));

          return {
            sources,
            subtitles: []
          };
        }
      }
    } catch (directErr) {
      // Direct fetch failed (e.g. network/CORS), proceed to backend
    }

    // 2. Fallback: Request ke Backend /api/scrape
    let scrapeUrl = `/api/scrape?tmdbId=${tmdbId}&type=${type}`;
    if (type === "tv") {
      scrapeUrl += `&season=${season || 1}&episode=${episode || 1}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const token = generateChallengeToken();
    const scrapeRes = await fetch(scrapeUrl, {
      signal: controller.signal,
      headers: {
        'X-Imintul-Token': token
      }
    });
    clearTimeout(timeoutId);

    if (!scrapeRes.ok) {
      if (scrapeRes.status !== 404) {
        console.warn(`Scrape API returned ${scrapeRes.status}`);
      }
      return null;
    }
    
    const contentType = scrapeRes.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Backend mengembalikan format non-JSON.", await scrapeRes.text());
      return null;
    }

    const scrapeData = await scrapeRes.json();
    
    if (scrapeData && scrapeData.success && scrapeData.sources) {
      return {
        sources: scrapeData.sources,
        subtitles: scrapeData.captions || []
      };
    }

    return null;
  } catch (error) {
    console.warn("Backend Scraper Error:", error);
    return null;
  }
}
