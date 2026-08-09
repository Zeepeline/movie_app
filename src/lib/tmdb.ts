import type {
  Genre,
  Media,
  MovieDetails,
  PaginatedResponse,
  TvSeasonDetails,
} from "../types/tmdb";

const BASE_URL = "https://api.themoviedb.org/3";

// Helper to get the API key from Vite environment variables
function getApiKey(): string | undefined {
  return import.meta.env.VITE_TMDB_API_KEY;
}

export async function fetchTMDB<T = any>(endpoint: string): Promise<T> {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === "masukkan_api_key_tmdb_anda_disini") {
    throw new Error(
      "TMDB API Key is missing. Please set VITE_TMDB_API_KEY in your .env file.",
    );
  }

  try {
    const separator = endpoint.includes("?") ? "&" : "?";
    const response = await fetch(
      `${BASE_URL}${endpoint}${separator}api_key=${apiKey}&language=en-US`,
    );
    if (!response.ok) {
      throw new Error(`TMDB API Error: ${response.statusText}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error fetching from TMDB:", error);
    throw error;
  }
}

export async function getTrendingMovies(): Promise<Media[]> {
  const data = await fetchTMDB<PaginatedResponse<Media>>("/trending/movie/day");
  return data.results || [];
}

export async function getTopRatedMovies(page: number = 1): Promise<Media[]> {
  const data = await fetchTMDB<PaginatedResponse<Media>>(
    `/movie/top_rated?page=${page}`,
  );
  return data.results || [];
}

export async function getNowPlayingMovies(): Promise<Media[]> {
  const data = await fetchTMDB<PaginatedResponse<Media>>("/movie/now_playing");
  return data.results || [];
}

export async function getIndonesianMovies(page: number = 1): Promise<Media[]> {
  const today = new Date().toISOString().split("T")[0];
  // Filter Indonesian movies released up to today, sorted by release date descending, with at least some popularity to filter out pure junk
  const data = await fetchTMDB<PaginatedResponse<Media>>(
    `/discover/movie?with_original_language=id&page=${page}&sort_by=primary_release_date.desc&primary_release_date.lte=${today}&vote_count.gte=1`,
  );
  return data.results || [];
}

export async function getKidsMovies(
  page: number = 1,
  year: string | null = null,
): Promise<Media[]> {
  // 16 is Animation, 10751 is Family
  let url = `/discover/movie?with_genres=16,10751&page=${page}`;
  if (year) url += `&primary_release_year=${year}`;
  const data = await fetchTMDB<PaginatedResponse<Media>>(url);
  return data.results || [];
}

export async function searchMovies(query: string): Promise<Media[]> {
  if (!query || query.trim() === "") return [];
  const data = await fetchTMDB<PaginatedResponse<Media>>(
    `/search/movie?query=${encodeURIComponent(query)}`,
  );
  return data.results || [];
}

export async function getGenres(
  mediaType: "movie" | "tv" = "movie",
): Promise<Genre[]> {
  const data = await fetchTMDB<{ genres: Genre[] }>(`/genre/${mediaType}/list`);
  return data.genres || [];
}

export async function getMoviesByGenre(
  genreId: number | null,
  page: number = 1,
  year: string | null = null,
): Promise<Media[]> {
  let url = `/discover/movie?page=${page}`;
  if (genreId) url += `&with_genres=${genreId}`;
  if (year) url += `&primary_release_year=${year}`;

  const data = await fetchTMDB<PaginatedResponse<Media>>(url);
  return data.results || [];
}

export async function getTopRatedTvSeries(page: number = 1): Promise<Media[]> {
  const data = await fetchTMDB<PaginatedResponse<Media>>(
    `/tv/top_rated?page=${page}`,
  );
  return data.results || [];
}

export async function getTvSeriesByGenre(
  genreId: number | null,
  page: number = 1,
  year: string | null = null,
): Promise<Media[]> {
  let url = `/discover/tv?page=${page}`;
  if (genreId) url += `&with_genres=${genreId}`;
  if (year) url += `&first_air_date_year=${year}`;

  const data = await fetchTMDB<PaginatedResponse<Media>>(url);
  return data.results || [];
}

export async function getMovieDetails(
  id: number | string,
): Promise<MovieDetails> {
  return await fetchTMDB<MovieDetails>(`/movie/${id}`);
}

export async function getMovieDetailsFull(
  id: number | string,
  mediaType: string = "movie",
): Promise<MovieDetails> {
  return await fetchTMDB<MovieDetails>(
    `/${mediaType}/${id}?append_to_response=credits,similar,reviews,videos,external_ids`,
  );
}

export async function getPersonDetail(id: number | string) {
  return await fetchTMDB(`/person/${id}`);
}

export async function getPersonCredits(id: number | string) {
  return await fetchTMDB(`/person/${id}/combined_credits`);
}

export async function getReviews(
  id: number | string,
  mediaType: string = "movie",
  page: number = 1,
) {
  return await fetchTMDB(`/${mediaType}/${id}/reviews?page=${page}`);
}

export async function getTvSeasonDetails(
  tvId: number | string,
  seasonNumber: number,
): Promise<TvSeasonDetails> {
  return await fetchTMDB<TvSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

export function getImageUrl(
  path: string | null,
  size: string = "w780",
): string {
  if (!path)
    return "https://via.placeholder.com/780x1170/333333/ffffff?text=No+Image";

  // Use original for better quality on Hero backgrounds
  if (size === "original") {
    return `https://image.tmdb.org/t/p/original${path}`;
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
