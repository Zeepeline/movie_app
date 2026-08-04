export interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface Subtitle {
  url: string;
  lang: string;
}

export interface StreamData {
  sources: StreamSource[];
  subtitles: Subtitle[];
}

export async function getStreamLinks(
  tmdbId: string | number,
  type: string = "movie",
  season?: number,
  episode?: number,
): Promise<StreamData | null> {
  try {
    // 1. Ambil informasi film/series dasar dari TMDB untuk mendapatkan title & releaseYear
    const tmdbApiUrl = `https://api.themoviedb.org/3/${type === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=4b8c9c4021ba0928e3fa0ebbf7cd9107`;
    const tmdbRes = await fetch(tmdbApiUrl);
    if (!tmdbRes.ok) throw new Error("TMDB fetch failed");
    const tmdbData = await tmdbRes.json();

    const title = tmdbData.title || tmdbData.name || "Movie";
    const releaseYear = (
      tmdbData.release_date ||
      tmdbData.first_air_date ||
      "2024"
    ).substring(0, 4);

    // 2. Tembak ke Backend Scraper (movie-web) lokal kita
    let scrapeUrl = `http://localhost:3000/api/scrape?tmdbId=${tmdbId}&type=${type}&title=${encodeURIComponent(title)}&releaseYear=${releaseYear}`;
    if (type === "tv" && season && episode) {
      scrapeUrl += `&season=${season}&episode=${episode}`;
    }

    const scrapeRes = await fetch(scrapeUrl, {
      signal: AbortSignal.timeout(10000), // tunggu max 10 detik
    });

    if (!scrapeRes.ok) return null;
    const scrapeData = await scrapeRes.json();

    if (scrapeData.success && scrapeData.streamUrl) {
      return {
        sources: [
          {
            url: scrapeData.streamUrl,
            quality: "auto",
            isM3U8: scrapeData.streamUrl.includes(".m3u8"),
          },
        ],
        subtitles: scrapeData.captions || [],
      };
    }

    return null;
  } catch (error) {
    console.warn(
      "Backend Scraper lokal gagal atau tidak ditemukan stream. Menggunakan mode Fallback (Iframe).",
    );
    return null;
  }
}
