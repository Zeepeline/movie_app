import type { StreamSource, Subtitle, StreamData } from '../types/stream';

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
    
    const scrapeRes = await fetch(scrapeUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!scrapeRes.ok) return null;
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
