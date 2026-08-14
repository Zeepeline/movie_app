export interface Media {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  adult?: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface PaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface MovieCollection {
  id: number;
  name: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Media[];
}

export interface MovieDetails extends Media {
  runtime?: number;
  genres?: Genre[];
  tagline?: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
  credits?: {
    cast: any[];
    crew: any[];
  };
  similar?: PaginatedResponse<Media>;
  reviews?: PaginatedResponse<any>;
}

export interface TvSeasonDetails {
  _id: string;
  air_date: string;
  episodes: any[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}
