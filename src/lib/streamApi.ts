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
    // 1. Ambil informasi film/series dasar dari TMDB untuk mendapatkan title & releaseYear
    const apiKey = import.meta.env.VITE_TMDB_API_KEY || '4b8c9c4021ba0928e3fa0ebbf7cd9107';
    const tmdbApiUrl = `https://api.themoviedb.org/3/${type === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${apiKey}`;
    const tmdbRes = await fetch(tmdbApiUrl);
    if (!tmdbRes.ok) throw new Error("TMDB fetch failed");
    const tmdbData = await tmdbRes.json();

    const title = tmdbData.title || tmdbData.name || "Movie";
    const releaseYear = (
      tmdbData.release_date ||
      tmdbData.first_air_date ||
      "2024"
    ).substring(0, 4);

    // 2. Tembak ke Backend (Cloudflare Worker lokal/prod)
    let scrapeUrl = `/api/scrape?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}&releaseYear=${releaseYear}`;
    if (type === "tv" && season && episode) {
      scrapeUrl += `&season=${season}&episode=${episode}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const token = generateChallengeToken();
    const scrapeRes = await fetch(scrapeUrl, {
      signal: controller.signal,
      headers: {
        'X-Imintul-Token': token
      }
    });
    clearTimeout(timeoutId);

    if (!scrapeRes.ok) {
      console.error(`Scrape API Failed (${scrapeRes.status}):`, await scrapeRes.text());
      return null;
    }
    
    // Pastikan response adalah JSON (mencegah error parsing jika CF Pages mengembalikan index.html)
    const contentType = scrapeRes.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Backend mengembalikan format non-JSON (Mungkin Functions belum ter-deploy dengan benar di Cloudflare).", await scrapeRes.text());
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
