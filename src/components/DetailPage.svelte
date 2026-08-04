<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getImageUrl, getMovieDetailsFull, getTvSeasonDetails } from '../lib/tmdb';
  import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../lib/watchlist';
  import MovieCard from './MovieCard.svelte';

  export let movieId: number | string;
  export let mediaType: string = 'movie';

  const dispatch = createEventDispatcher();
  let movie: any = null;
  let isLoading = true;
  let inWatchlist = false;

  // TV Series Episodes State
  let selectedSeasonNumber: number | null = null;
  let validSeasons: any[] = [];
  let episodes: any[] = [];
  let isEpisodesLoading = false;

  let isComingSoon = false;
  let isRecentlyReleased = false;

  $: {
    if (movie) {
      inWatchlist = isInWatchlist(movie.id);
    }
  }

  onMount(async () => {
    isLoading = true;
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
  });

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
      season: selectedSeasonNumber || undefined,
      episode: 1 // Default to episode 1 if playing from the main button
    });
  }

  function handleRelatedMovieDetail(event: CustomEvent<{ id: string | number }>) {
    // Navigate to new detail page
    dispatch('detail', { id: event.detail.id });
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
  <div class="w-full h-screen flex items-center justify-center">
    <div class="animate-spin h-10 w-10 border-4 border-brand-red border-t-transparent rounded-full"></div>
  </div>
{:else if movie}
  <div class="w-full min-h-screen bg-bg-base text-white pb-16 animate-fade-in relative z-10 pt-20">
    <!-- Background Image -->
    <div class="absolute inset-0 -z-10 h-[70vh]">
      <img src={getImageUrl(movie.backdrop_path, 'original')} alt={movie.title} class="w-full h-full object-cover opacity-30" />
      <div class="absolute inset-0 bg-linear-to-t from-bg-base via-bg-base/80 to-transparent"></div>
    </div>

    <div class="w-full max-w-[1600px] mx-auto px-[4%]">
      <!-- Back Button -->
      <button 
        class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md"
        on:click={handleBack}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span>Back to Home</span>
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
            <div class="mb-6 flex items-start gap-3 bg-brand-red/10 border border-brand-red/30 rounded-lg p-4 text-white max-w-2xl backdrop-blur-sm">
              <svg class="w-6 h-6 shrink-0 mt-0.5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <div>
                <p class="font-bold text-brand-red">Belum Rilis / Coming Soon</p>
                <p class="text-sm opacity-80 mt-1">Video untuk {mediaType === 'tv' ? 'serial' : 'film'} ini belum tersedia karena belum dirilis secara resmi.</p>
              </div>
            </div>
          {:else if isRecentlyReleased}
            <div class="mb-6 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-white max-w-2xl backdrop-blur-sm">
              <svg class="w-6 h-6 shrink-0 mt-0.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <p class="font-bold text-yellow-500">Baru Rilis / In Theaters</p>
                <p class="text-sm opacity-80 mt-1">Film ini baru tayang dalam waktu dekat (kurang dari 45 hari). Kualitas video mungkin belum tersedia, masih kosong, atau kualitas bioskop (CAM).</p>
              </div>
            </div>
          {/if}

          <div class="flex gap-4">
            <button 
              class="rounded-full px-8 py-3.5 font-bold text-base inline-flex items-center justify-center gap-2 transition-colors bg-brand-red text-white hover:bg-brand-red/90 shadow-[0_0_20px_rgba(229,9,20,0.4)]"
              on:click={handlePlay}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span>Play Now</span>
            </button>
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
                        on:click={() => dispatch('play', { id: movie.id, type: 'tv', season: episode.season_number, episode: episode.episode_number })}
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
              <div class="w-32 shrink-0 snap-start flex flex-col items-center text-center">
                <div class="w-24 h-24 rounded-full overflow-hidden mb-3 bg-white/10 border-2 border-white/5">
                  {#if actor.profile_path}
                    <img src={getImageUrl(actor.profile_path, 'w185')} alt={actor.name} class="w-full h-full object-cover" />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center bg-white/5 text-white/30">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                  {/if}
                </div>
                <p class="text-sm font-bold text-white leading-tight">{actor.name}</p>
                <p class="text-xs text-white/50 mt-1 line-clamp-2">{actor.character}</p>
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
                on:play={handleRelatedMovieDetail}
              />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
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
