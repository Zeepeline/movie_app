<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import MovieCard from '../components/MovieCard.svelte';
  import { getImageUrl, getMovieCollection, getMovieDetailsFull, getReviews, getTvSeasonDetails } from '../lib/tmdb';
  import { historyStore } from '../store/history';
  import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../store/watchlist';

  export let movieId: number | string;
  export let mediaType: string = 'movie';

  const dispatch = createEventDispatcher();
  let movie: any = null;
  let collection: any = null;
  let isCollectionLoading = false;
  let isLoading = true;
  let inWatchlist = false;

  // TV Series Episodes State
  let selectedSeasonNumber: number | null = null;
  let validSeasons: any[] = [];
  let episodes: any[] = [];
  let isEpisodesLoading = false;

  let isForceLandscape = false;
  let hasHistory = false;
  let lastWatchedSeason = 1;
  let lastWatchedEpisode = 1;

  let reviewPage = 1;
  let totalReviewPages = 1;
  let reviews: any[] = [];
  let isFetchingReviews = false;
  let reviewContainer: HTMLDivElement;

  async function loadReviewPage(page: number) {
    if (page < 1 || page > totalReviewPages || isFetchingReviews) return;
    isFetchingReviews = true;
    try {
      const data = await getReviews(movieId, mediaType, page);
      reviews = data.results;
      reviewPage = data.page;
      totalReviewPages = data.total_pages;
      if (reviewContainer) {
        reviewContainer.scrollTo({ left: 0, behavior: 'smooth' });
      }
    } catch (error) {
      console.error(error);
    } finally {
      isFetchingReviews = false;
    }
  }

  let isComingSoon = false;
  let isRecentlyReleased = false;

  let showTrailerModal = false;
  let trailerKey = "";

  $: {
    if (movie) {
      inWatchlist = isInWatchlist(movie.id);
      
      const historyItem = $historyStore.find(item => item.id == movieId);
      if (historyItem && mediaType === 'tv') {
        hasHistory = true;
        lastWatchedSeason = historyItem.season || 1;
        lastWatchedEpisode = historyItem.episode || 1;
      }

      if (movie.videos && movie.videos.results) {
        const trailer = movie.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) {
          trailerKey = trailer.key;
        }
      }
    }
  }

  $: if (movieId || mediaType) {
    fetchMovieData();
  }

  async function fetchMovieData() {
    isLoading = true;
    collection = null;
    try {
      movie = await getMovieDetailsFull(movieId, mediaType);
      
      const releaseDateStr = mediaType === 'tv' ? movie.first_air_date : movie.release_date;
      if (releaseDateStr) {
        const releaseDate = new Date(releaseDateStr);
        const now = new Date();
        const diffTime = now.getTime() - releaseDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        isComingSoon = diffDays < 0;
        isRecentlyReleased = diffDays >= 0 && diffDays <= 45;
      } else {
        isComingSoon = false;
        isRecentlyReleased = false;
      }

      if (movie.reviews) {
        reviews = movie.reviews.results;
        reviewPage = movie.reviews.page || 1;
        totalReviewPages = movie.reviews.total_pages || 1;
      }
      
      // Auto-load collection if movie belongs to a franchise
      if (movie.belongs_to_collection && movie.belongs_to_collection.id) {
        try {
          isCollectionLoading = true;
          const colData = await getMovieCollection(movie.belongs_to_collection.id);
          if (colData && colData.parts) {
            colData.parts.sort((a: any, b: any) => {
              const dateA = new Date(a.release_date || '1970-01-01').getTime();
              const dateB = new Date(b.release_date || '1970-01-01').getTime();
              return dateA - dateB;
            });
            collection = colData;
          }
        } catch (colErr) {
          console.error("Gagal load collection:", colErr);
        } finally {
          isCollectionLoading = false;
        }
      }

      // Auto-load episodes if it's a TV series
      if (mediaType === 'tv' && movie.seasons && movie.seasons.length > 0) {
        validSeasons = movie.seasons.filter((s: any) => s.season_number > 0);
        if (validSeasons.length > 0) {
          selectedSeasonNumber = validSeasons[0].season_number;
          loadEpisodes(selectedSeasonNumber);
        }
      }
      
      // Scroll to top when opening details
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  async function loadEpisodes(seasonNum: number | null) {
    if (seasonNum === null || !movie) return;
    isEpisodesLoading = true;
    try {
      const seasonData = await getTvSeasonDetails(movie.id, seasonNum);
      episodes = seasonData.episodes || [];
    } catch(e) {
      console.error(e);
    } finally {
      isEpisodesLoading = false;
    }
  }

  function handleSeasonChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const seasonNum = parseInt(target.value);
    selectedSeasonNumber = seasonNum;
    loadEpisodes(seasonNum);
  }

  function handleBack() {
    dispatch('back');
  }

  function handlePlay() {
    dispatch('play', { 
      id: movieId, 
      type: mediaType,
      title: movie?.title || movie?.name,
      imageUrl: movie?.backdrop_path || movie?.poster_path,
      season: hasHistory ? lastWatchedSeason : (selectedSeasonNumber || undefined),
      episode: hasHistory ? lastWatchedEpisode : 1 
    });
  }

  function handleRelatedMovieDetail(event: CustomEvent<{ id: string | number, type?: string }>) {
    // Navigate to new detail page
    dispatch('detail', { id: event.detail.id, type: event.detail.type });
  }

  function toggleWatchlist() {
    if (!movie) return;
    
    if (inWatchlist) {
      removeFromWatchlist(movie.id);
      inWatchlist = false;
    } else {
      addToWatchlist({
        id: movie.id,
        title: movie.title || movie.name,
        poster_path: movie.poster_path,
        vote_average: movie.vote_average,
        media_type: mediaType,
        release_date: movie.release_date || movie.first_air_date
      });
      inWatchlist = true;
    }
  }
</script>

{#if isLoading}
  <div class="w-full min-h-screen bg-bg-base text-white pb-16 relative z-10 pt-20">
    <!-- Backdrop Shimmer -->
    <div class="absolute inset-0 -z-10 h-[70vh] bg-bg-elevated shimmer opacity-40">
      <div class="absolute inset-0 bg-linear-to-t from-bg-base via-bg-base/80 to-transparent"></div>
    </div>

    <div class="w-full max-w-[1600px] mx-auto px-[4%]">
      <!-- Back Button Skeleton -->
      <div class="w-28 h-9 rounded-full bg-white/10 shimmer mb-8"></div>

      <!-- Main Detail Skeleton -->
      <div class="flex flex-col md:flex-row gap-8 lg:gap-12 mb-16">
        <!-- Poster Skeleton -->
        <div class="w-full md:w-1/3 lg:w-1/4 shrink-0">
          <div class="rounded-2xl aspect-2/3 bg-white/10 shimmer border border-white/5 shadow-2xl"></div>
        </div>

        <!-- Info Skeleton -->
        <div class="flex flex-col justify-center flex-1">
          <div class="w-3/4 h-10 md:h-12 rounded-xl bg-white/10 shimmer mb-4"></div>
          
          <div class="flex items-center gap-3 mb-6">
            <div class="w-14 h-5 rounded-full bg-white/10 shimmer"></div>
            <div class="w-12 h-5 rounded-full bg-white/10 shimmer"></div>
            <div class="w-16 h-5 rounded-full bg-white/10 shimmer"></div>
            <div class="w-24 h-5 rounded-full bg-white/10 shimmer"></div>
          </div>

          <div class="flex items-center gap-4 mb-8">
            <div class="w-36 h-12 rounded-xl bg-white/10 shimmer"></div>
            <div class="w-40 h-12 rounded-xl bg-white/10 shimmer"></div>
            <div class="w-12 h-12 rounded-xl bg-white/10 shimmer"></div>
          </div>

          <!-- Overview lines -->
          <div class="space-y-3 max-w-3xl">
            <div class="w-full h-4 rounded bg-white/10 shimmer"></div>
            <div class="w-11/12 h-4 rounded bg-white/10 shimmer"></div>
            <div class="w-4/5 h-4 rounded bg-white/10 shimmer"></div>
          </div>
        </div>
      </div>

      <!-- Cast Skeleton -->
      <div class="mb-12">
        <div class="w-36 h-8 rounded-lg bg-white/10 shimmer mb-6"></div>
        <div class="flex gap-4 overflow-hidden pb-4">
          {#each Array(6) as _}
            <div class="w-32 shrink-0 flex flex-col items-center">
              <div class="w-24 h-24 rounded-full bg-white/10 shimmer mb-3"></div>
              <div class="w-20 h-4 rounded bg-white/10 shimmer mb-1.5"></div>
              <div class="w-14 h-3 rounded bg-white/10 shimmer"></div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{:else if movie}
  <div class="w-full min-h-screen bg-bg-base text-white pb-16 animate-fade-in relative z-10 pt-24 md:pt-28">
    <!-- Background Image -->
    <div class="absolute inset-0 -z-10 h-[70vh]">
      <img src={getImageUrl(movie.backdrop_path, 'original')} alt={movie.title} class="w-full h-full object-cover opacity-30" />
      <div class="absolute inset-0 bg-linear-to-t from-bg-base via-bg-base/80 to-transparent"></div>
    </div>

    <div class="w-full max-w-[1600px] mx-auto px-[4%]">
      <!-- Back Button -->
      <button 
        class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 hover:-translate-x-1 mb-8 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/5"
        on:click={handleBack}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span class="font-medium text-sm">Kembali</span>
      </button>

      <!-- Main Detail Section -->
      <div class="flex flex-col md:flex-row gap-8 lg:gap-12 mb-16">
        <!-- Poster -->
        <div class="w-full md:w-1/3 lg:w-1/4 shrink-0">
          <div class="rounded-2xl overflow-hidden shadow-2xl aspect-2/3">
            <img src={getImageUrl(movie.poster_path, 'w780')} alt={movie.title} class="w-full h-full object-cover" />
          </div>
        </div>

        <!-- Info -->
        <div class="flex flex-col justify-center flex-1">
          <h1 class="text-4xl md:text-5xl font-extrabold mb-4">{movie.title || movie.name}</h1>
          
          <div class="flex flex-wrap items-center gap-4 text-sm font-medium text-white/80 mb-6">
            <span class="flex items-center gap-1 text-yellow-500 font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>
              {movie.vote_average?.toFixed(1)}
            </span>
            <span>•</span>
            <span>{(movie.release_date || movie.first_air_date || '').substring(0, 4)}</span>
            {#if movie.runtime}
              <span>•</span>
              <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
            {/if}
            {#if movie.genres && movie.genres.length > 0}
              <span>•</span>
              <span>{movie.genres.map((g: any) => g.name).join(', ')}</span>
            {/if}
          </div>

          <p class="text-lg text-white/80 leading-relaxed mb-8 max-w-3xl">
            {movie.overview}
          </p>

          <!-- Release Warning -->
          {#if isComingSoon}
            <div class="inline-flex items-center gap-2.5 bg-brand-red/10 border border-brand-red/20 px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              <svg class="w-4 h-4 text-brand-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <span class="text-sm font-medium text-brand-red">Belum Rilis (Video belum tersedia)</span>
            </div>
          {:else if isRecentlyReleased}
            <div class="inline-flex items-center gap-2.5 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
              <svg class="w-4 h-4 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span class="text-sm font-medium text-yellow-500">Baru Tayang (Kualitas video mungkin masih CAM/Belum HD)</span>
            </div>
          {/if}

          <!-- Actions -->
          <div class="flex flex-wrap items-center gap-4">
            <button 
              class="bg-white text-black hover:bg-white/90 font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 flex items-center gap-2 shrink-0"
              on:click={handlePlay}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>{hasHistory ? `Lanjutkan S${lastWatchedSeason} E${lastWatchedEpisode}` : 'Play Now'}</span>
            </button>
            
            {#if trailerKey}
              <button 
                class="bg-white/10 text-white hover:bg-white/20 font-bold py-3 px-6 rounded-full transition-all duration-300 backdrop-blur-md border border-white/20 flex items-center gap-2 shrink-0"
                on:click={() => showTrailerModal = true}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                <span>Trailer</span>
              </button>
            {/if}
            <button 
              class={`rounded-full w-14 h-14 font-semibold inline-flex items-center justify-center transition-colors backdrop-blur-md border border-white/10 ${inWatchlist ? 'bg-white/30 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              aria-label={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              on:click={toggleWatchlist}
            >
              {#if inWatchlist}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Episodes Section (Only for TV Series) -->
      {#if mediaType === 'tv' && validSeasons.length > 0}
        <div class="mb-12">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold">Episodes</h2>
            
            <div class="relative">
              <select 
                class="appearance-none bg-white/10 border border-white/20 text-white py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red cursor-pointer backdrop-blur-md"
                on:change={handleSeasonChange}
                value={selectedSeasonNumber}
              >
                {#each validSeasons as season}
                  <option value={season.season_number} class="bg-bg-elevated text-white">
                    {season.name} ({season.episode_count} Episodes)
                  </option>
                {/each}
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {#if isEpisodesLoading}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {#each Array(8) as _}
                <div class="w-full animate-pulse">
                  <div class="w-full aspect-video bg-white/10 rounded-lg mb-2"></div>
                  <div class="h-4 bg-white/10 rounded w-3/4 mb-1"></div>
                  <div class="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              {/each}
            </div>
          {:else if episodes.length > 0}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {#each episodes as episode}
                <div class="w-full group relative">
                  <div class="w-full aspect-video rounded-lg overflow-hidden mb-3 bg-white/5 relative border border-white/10">
                    {#if episode.still_path}
                      <img src={getImageUrl(episode.still_path, 'w500')} alt={episode.name} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    {:else}
                      <div class="w-full h-full flex flex-col items-center justify-center text-white/30 p-4 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                      </div>
                    {/if}
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        class="w-12 h-12 bg-brand-red rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                        aria-label="Play episode {episode.episode_number}"
                        on:click={() => dispatch('play', { id: movie.id, type: 'tv', title: `${movie.title || movie.name} - S${episode.season_number}E${episode.episode_number}`, imageUrl: episode.still_path || movie.backdrop_path || movie.poster_path, season: episode.season_number, episode: episode.episode_number })}
                      >
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                      </button>
                    </div>
                  </div>
                  <h3 class="font-bold text-base line-clamp-1 text-white">{episode.episode_number}. {episode.name}</h3>
                  <p class="text-sm text-white/50 mb-1">{episode.air_date ? new Date(episode.air_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : 'TBA'}</p>
                  <p class="text-xs text-white/70 line-clamp-2 leading-relaxed">{episode.overview || 'No description available.'}</p>
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-8 text-white/50 bg-white/5 rounded-xl border border-white/10">
              No episodes found for this season.
            </div>
          {/if}
        </div>
      {/if}

      <!-- Cast -->
      {#if movie.credits && movie.credits.cast && movie.credits.cast.length > 0}
        <div class="mb-12">
          <h2 class="text-2xl font-bold mb-6">Top Cast</h2>
          <div class="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {#each movie.credits.cast.slice(0, 10) as actor}
              <a 
                href={`/?person=${actor.id}`}
                class="w-32 shrink-0 snap-start flex flex-col items-center text-center group block cursor-pointer"
                on:click|preventDefault={() => dispatch('personDetail', { id: actor.id })}
              >
                <div class="w-24 h-24 rounded-full overflow-hidden mb-3 bg-white/10 border-2 border-white/5 group-hover:border-white/20 transition-colors">
                  {#if actor.profile_path}
                    <img src={getImageUrl(actor.profile_path, 'w185')} alt={actor.name} class="w-full h-full object-cover" />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center bg-white/5 text-white/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  {/if}
                </div>
                <p class="text-sm font-bold text-white leading-tight group-hover:text-brand-red transition-colors">{actor.name}</p>
                <p class="text-xs text-white/50 mt-1 line-clamp-2">{actor.character}</p>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Reviews -->
      {#if reviews && reviews.length > 0}
        <div class="mb-12 relative">
          <div class="flex items-center gap-3 mb-8">
            <h2 class="text-2xl font-bold text-white">Reviews & Comments</h2>
            <div class="h-px bg-white/10 flex-1 ml-4 hidden sm:block"></div>
            
            <!-- Navigation Arrows -->
            {#if totalReviewPages > 1}
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <span class="text-white/50 text-sm font-medium mr-2">Hal {reviewPage} dari {totalReviewPages}</span>
                <button 
                  class="w-10 h-10 rounded-full flex items-center justify-center transition-colors {reviewPage === 1 ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 border border-white/10'}"
                  on:click={() => loadReviewPage(reviewPage - 1)}
                  disabled={reviewPage === 1 || isFetchingReviews}
                  aria-label="Previous Reviews Page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button 
                  class="w-10 h-10 rounded-full flex items-center justify-center transition-colors {reviewPage === totalReviewPages ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 border border-white/10'}"
                  on:click={() => loadReviewPage(reviewPage + 1)}
                  disabled={reviewPage === totalReviewPages || isFetchingReviews}
                  aria-label="Next Reviews Page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            {/if}
          </div>
          
          <div 
            bind:this={reviewContainer}
            class="flex overflow-x-auto gap-4 lg:gap-6 no-scrollbar snap-x snap-mandatory pb-4 {isFetchingReviews ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300"
          >
            {#each reviews as review}
              <div class="group relative bg-white/2 border border-white/5 hover:border-white/10 p-6 rounded-3xl transition-all duration-300 hover:bg-white/4 overflow-hidden shrink-0 snap-start w-75 md:w-100">
                <!-- Decorative Quote Icon -->
                <svg class="absolute top-4 right-4 w-16 h-16 text-white/3 group-hover:text-white/6 transition-colors duration-500 rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                
                <div class="relative z-10 flex flex-col h-full">
                  <div class="flex items-center gap-4 mb-5">
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-brand-red/10 border-2 border-brand-red/20 shrink-0 shadow-lg">
                      {#if review.author_details?.avatar_path}
                        <img src={review.author_details.avatar_path.startsWith('/https') ? review.author_details.avatar_path.substring(1) : getImageUrl(review.author_details.avatar_path, 'w185')} alt={review.author} class="w-full h-full object-cover" />
                      {:else}
                        <div class="w-full h-full flex items-center justify-center text-brand-red text-xl font-bold uppercase">
                          {review.author.charAt(0)}
                        </div>
                      {/if}
                    </div>
                    <div>
                      <h3 class="font-bold text-white text-base leading-tight truncate w-40 md:w-56">{review.author}</h3>
                      {#if review.author_details?.rating}
                        <div class="flex items-center gap-1.5 mt-1.5 bg-white/5 w-max px-2 py-0.5 rounded-full border border-white/10">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5 text-yellow-500"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>
                          <span class="text-white/90 font-bold text-xs">{review.author_details.rating}<span class="text-white/40 font-normal">/10</span></span>
                        </div>
                      {/if}
                    </div>
                  </div>
                  
                  <div class="flex-1">
                    <p class="text-white/60 leading-relaxed text-sm relative prose-sm prose-invert prose-p:my-1 line-clamp-6">
                      <span class="text-brand-red/40 text-xl leading-none absolute -left-2 -top-1 font-serif">"</span>
                      <span class="pl-2">{@html review.content.replace(/&lt;/g, '<').replace(/&gt;/g, '>')}</span>
                    </p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Franchise / Movie Collection Section -->
      {#if collection && collection.parts && collection.parts.length > 1}
        <div class="mb-14 relative overflow-hidden rounded-3xl bg-linear-to-r from-bg-elevated via-bg-elevated/70 to-transparent border border-white/10 p-6 md:p-8">
          <!-- Ambient collection backdrop -->
          {#if collection.backdrop_path}
            <div class="absolute inset-0 -z-10 opacity-20">
              <img src={getImageUrl(collection.backdrop_path, 'original')} alt={collection.name} class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-linear-to-r from-bg-elevated via-bg-elevated/90 to-bg-elevated/70"></div>
            </div>
          {/if}

          <div class="flex flex-col mb-6">
            <span class="text-brand-red font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Koleksi & Sekuel
            </span>
            <h2 class="text-2xl md:text-3xl font-extrabold text-white">{collection.name}</h2>
            {#if collection.overview}
              <p class="text-white/60 text-sm mt-2 max-w-3xl line-clamp-2">{collection.overview}</p>
            {/if}
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {#each collection.parts as partMovie}
              <div class="relative group">
                <MovieCard 
                  movieId={partMovie.id}
                  title={partMovie.title || partMovie.name}
                  imageUrl={getImageUrl(partMovie.poster_path)}
                  rating={partMovie.vote_average || 0}
                  type={'Movie'}
                  year={(partMovie.release_date || '').substring(0, 4)}
                  on:detail={handleRelatedMovieDetail}
                />
                {#if Number(partMovie.id) === Number(movieId)}
                  <div class="absolute top-2 left-2 z-20 pointer-events-none bg-brand-red text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg">
                    Sedang Dilihat
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Similar Movies -->
      {#if movie.similar && movie.similar.results && movie.similar.results.length > 0}
        <div>
          <h2 class="text-2xl font-bold mb-6">Similar Movies</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {#each movie.similar.results.slice(0, 6) as similarMovie}
              <MovieCard 
                movieId={similarMovie.id}
                title={similarMovie.title || similarMovie.name}
                imageUrl={getImageUrl(similarMovie.poster_path)}
                rating={similarMovie.vote_average || 0}
                type={similarMovie.media_type || 'Movie'}
                year={(similarMovie.release_date || similarMovie.first_air_date || '').substring(0, 4)}
                on:detail={handleRelatedMovieDetail}
              />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Trailer Modal -->
  {#if showTrailerModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-500 p-4" transition:fade={{ duration: 200 }} on:click={() => showTrailerModal = false}>
      <div class="relative w-full max-w-5xl aspect-video bg-black shadow-2xl rounded-2xl overflow-hidden border border-white/10" on:click|stopPropagation role="presentation">
        <button 
          class="absolute top-4 right-4 z-10 text-white/70 hover:text-white bg-black/50 hover:bg-brand-red p-2 rounded-full transition-colors backdrop-blur-md"
          on:click={() => showTrailerModal = false}
          aria-label="Tutup trailer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <iframe 
          src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} 
          title="Trailer" 
          class="w-full h-full border-0" 
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
          allowfullscreen
        ></iframe>
      </div>
    </div>
  {/if}
{/if}

<style>
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
