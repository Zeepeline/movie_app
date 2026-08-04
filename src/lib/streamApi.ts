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

/**
 * Mencoba mengambil link video mentah dan subtitle dari Public Scraper API (Consumet).
 * Karena ini adalah API publik gratis, sering kali terjadi error/CORS/Down.
 * Jika fungsi ini me-return null, sistem akan otomatis menggunakan Iframe (Vidking).
 */
export async function getStreamLinks(
  tmdbId: string | number,
  type: string = "movie",
  season?: number,
  episode?: number,
): Promise<StreamData | null> {
  try {
    // Catatan: URL ini adalah contoh instance Consumet publik.
    // Jika Vercel app ini mati, Anda bisa menggantinya dengan URL backend Consumet Anda sendiri.
    const baseUrl = "https://consumet-api-clone.vercel.app/meta/tmdb";

    const infoUrl = `${baseUrl}/info/${tmdbId}?type=${type}`;
    const infoRes = await fetch(infoUrl, {
      // timeout agar tidak menunggu terlalu lama jika API mati
      signal: AbortSignal.timeout(5000),
    });

    if (!infoRes.ok) return null;

    const infoData = await infoRes.json();

    let episodeId = infoData.id;

    // Jika ini TV Series, kita harus mencari episodeId yang tepat
    if (type === "tv" && season && episode && infoData.seasons) {
      const targetSeason = infoData.seasons.find(
        (s: any) => s.season === season,
      );
      if (targetSeason && targetSeason.episodes) {
        const targetEpisode = targetSeason.episodes.find(
          (e: any) => e.episode === episode,
        );
        if (targetEpisode) {
          episodeId = targetEpisode.id;
        }
      }
    }

    // Mengambil stream (m3u8) berdasarkan episodeId
    const watchUrl = `${baseUrl}/watch/${episodeId}?id=${infoData.id}`;
    const watchRes = await fetch(watchUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!watchRes.ok) return null;
    const watchData = await watchRes.json();

    if (watchData.sources && watchData.sources.length > 0) {
      return {
        sources: watchData.sources,
        subtitles: watchData.subtitles || [],
      };
    }

    return null;
  } catch (error) {
    console.warn(
      "Public API Scraper gagal atau diblokir CORS. Menggunakan mode Fallback (Iframe).",
    );
    return null;
  }
}
