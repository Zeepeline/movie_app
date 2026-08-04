import {
  makeProviders,
  makeStandardFetcher,
  targets,
} from "@movie-web/providers";
import cors from "cors";
import express from "express";

const app = express();
const port = 3000;

app.use(cors());

// Gunakan native fetch Node.js
const fetcher = makeStandardFetcher(fetch);

// Inisialisasi providers dengan target 'any' agar semua sumber terbuka untuk server-side
const providers = makeProviders({
  fetcher,
  target: targets.ANY,
});

app.get("/api/scrape", async (req, res) => {
  const {
    tmdbId,
    type = "movie",
    title = "Movie",
    releaseYear = 2024,
    season,
    episode,
  } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ error: "tmdbId is required" });
  }

  try {
    console.log(
      `Scraping for TMDB ID: ${tmdbId}, Type: ${type}, Title: ${title}`,
    );

    // Konfigurasi media
    const media = {
      type: type,
      tmdbId: tmdbId.toString(),
      title: title,
      releaseYear: Number(releaseYear),
    };
    if (type === "show") {
      media.season = { number: Number(season), tmdbId: "" };
      media.episode = { number: Number(episode), tmdbId: "" };
    }

    // Jalankan scraper (mencari link dari berbagai provider)
    const result = await providers.runAll({
      media: media,
    });

    if (result && result.stream) {
      console.log("Stream found:", result.stream);
      return res.json({
        success: true,
        streamUrl:
          result.stream.playlist ||
          result.stream.qualities?.["1080p"]?.url ||
          result.stream.qualities?.["auto"]?.url ||
          Object.values(result.stream.qualities || {})[0]?.url,
        captions: result.stream.captions || [],
        raw: result.stream,
      });
    } else {
      console.log("No streams found");
      return res.status(404).json({ error: "No stream found" });
    }
  } catch (error) {
    console.error("Error scraping:", error);
    return res.status(500).json({ error: "Failed to scrape stream" });
  }
});

app.listen(port, () => {
  console.log(`Scraper backend berjalan di http://localhost:${port}`);
});
