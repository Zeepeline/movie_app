<script lang="ts">
  import { onMount } from 'svelte';
  import ContinueWatchingCard from "./components/ContinueWatchingCard.svelte";
  import Hero from "./components/Hero.svelte";
  import MovieCard from "./components/MovieCard.svelte";
  import Navbar from "./components/Navbar.svelte";
  import PlayerModal from "./components/PlayerModal.svelte";
  import { getImageUrl, getIndonesianMovies, getNowPlayingMovies, getTopRatedMovies, getTrendingMovies } from './lib/tmdb';
  import DetailPage from "./pages/DetailPage.svelte";
  import LoginPage from "./pages/LoginPage.svelte";
  import MoviesPage from "./pages/MoviesPage.svelte";
  import SeriesPage from "./pages/SeriesPage.svelte";
  import WatchlistPage from "./pages/WatchlistPage.svelte";
  import { historyStore, addToHistory } from './store/history';

  let trendingMovies: any[] = [];
  $: nowPlayingMovies = $historyStore;
  let topRatedMovies: any[] = [];
  let indoMovies: any[] = [];
  let heroMovies: any[] = [];
  let isLoading = true;

  // Pagination State
  let topRatedPage = 1;

  onMount(async () => {
    // History API setup
    window.addEventListener('popstate', (e) => {
      const state = e.state;
      if (state) {
        currentPage = state.page || 'home';
        detailMovieId = state.detailMovieId || null;
        if (state.detailMediaType) detailMediaType = state.detailMediaType;
        if (state.showPlayer && state.playerOptions) {
          playerOptions = state.playerOptions;
          showPlayer = true;
        } else {
          showPlayer = false;
        }
      } else {
        currentPage = 'home';
        detailMovieId = null;
        showPlayer = false;
      }
    });

    history.replaceState({ page: currentPage, detailMovieId, detailMediaType, showPlayer }, '');

    isLoading = true;
    try {
      const [trending, topRated, indo] = await Promise.all([
        getTrendingMovies(),
        getTopRatedMovies(),
        getIndonesianMovies()
      ]);
      trendingMovies = trending.slice(0, 6);
      topRatedMovies = topRated.slice(0, 6);
      indoMovies = indo.slice(0, 6);
      
      if (trendingMovies.length > 0) {
        heroMovies = trendingMovies.slice(0, 5);
      }
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  });

  // Player State
  let showPlayer = false;
  let playerOptions: { id: string | number, type: string, season?: number, episode?: number } | null = null;
  let detailMovieId: number | string | null = null;
  // Page State
  let currentPage = 'home';
  let detailMediaType: string = 'movie';

  function openDetail(event: CustomEvent<{ id: string | number, type?: string }>) {
    detailMovieId = event.detail.id;
    detailMediaType = event.detail.type?.toLowerCase() || 'movie';
    history.pushState({ page: currentPage, detailMovieId, detailMediaType, showPlayer: false }, '');
  }

  function handleNavigate(event: CustomEvent<{ page: string }>) {
    currentPage = event.detail.page;
    detailMovieId = null;
    history.pushState({ page: currentPage, detailMovieId: null, showPlayer: false }, '');
  }

  function openPlayer(event: CustomEvent<{ id: string | number, type?: string, season?: number, episode?: number, title?: string, imageUrl?: string }>) {
    playerOptions = {
      id: event.detail.id,
      type: event.detail.type?.toLowerCase() || 'movie',
      season: event.detail.season,
      episode: event.detail.episode
    };
    showPlayer = true;
    history.pushState({ page: currentPage, detailMovieId, detailMediaType, showPlayer: true, playerOptions }, '');
    
    if (event.detail.title && event.detail.imageUrl) {
      addToHistory({
        id: event.detail.id,
        type: event.detail.type?.toLowerCase() || 'movie',
        title: event.detail.title,
        imageUrl: event.detail.imageUrl,
        season: event.detail.season,
        episode: event.detail.episode
      });
    }
  }

  function closePlayer() {
    showPlayer = false;
    playerOptions = null;
    if (history.state?.showPlayer) {
      history.back();
    }
  }


</script>

<main class={currentPage === 'login' ? '' : 'pb-16'}>
  {#if currentPage !== 'login' && !detailMovieId}
    <Navbar 
      on:play={openPlayer} 
      on:detail={openDetail} 
      on:navigate={handleNavigate}
      on:openWatchlist={() => { currentPage = 'watchlist'; detailMovieId = null; history.pushState({ page: 'watchlist', detailMovieId: null }, ''); }} 
    />
  {/if}
  
  {#if detailMovieId}
    <DetailPage 
      movieId={detailMovieId}
      mediaType={detailMediaType}
      on:back={() => { if (history.state?.detailMovieId) history.back(); else detailMovieId = null; }}
      on:play={openPlayer}
      on:detail={openDetail}
    />
  {:else if currentPage === 'watchlist'}
    <WatchlistPage 
      on:back={() => { if (history.state?.page === 'watchlist') history.back(); else { currentPage = 'home'; history.pushState({ page: 'home' }, ''); } }}
      on:detail={openDetail}
    />
  {:else if currentPage === 'movies'}
    <MoviesPage on:detail={openDetail} />
  {:else if currentPage === 'series'}
    <SeriesPage on:detail={openDetail} />
  {:else if currentPage === 'login'}
    <LoginPage 
      on:loginSuccess={() => { currentPage = 'home'; }}
      on:navigateHome={() => { currentPage = 'home'; }}
    />
  {:else if currentPage === 'home'}
    {#if heroMovies.length > 0}
    <Hero 
      movies={heroMovies}
      on:play={openPlayer}
      on:detail={openDetail}
    />
  {:else}
    <div class="h-[80vh] min-h-125 w-full bg-bg-elevated animate-pulse rounded-b-[30px]"></div>
  {/if}

  <div class="relative z-20 flex flex-col gap-6 mt-3">
    <section class="w-full max-w-[1600px] mx-auto px-[4%] mb-2">
      <h2 class="text-xl font-bold text-white mb-4">Trending Movies</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {#if isLoading}
          {#each Array(6) as _}
            <div class="aspect-2/3 rounded-lg bg-bg-elevated animate-pulse"></div>
          {/each}
        {:else}
          {#each trendingMovies as movie}
            <MovieCard 
              movieId={movie.id}
              title={movie.title || movie.name}
              imageUrl={getImageUrl(movie.poster_path)}
              rating={movie.vote_average || 0}
              type={movie.media_type || 'Movie'}
              year={(movie.release_date || movie.first_air_date || '').substring(0, 4)}
              on:detail={openDetail}
            />
          {/each}
        {/if}
      </div>
    </section>

    {#if nowPlayingMovies.length > 0}
      <section class="w-full max-w-[1600px] mx-auto px-[4%] mb-2">
          <h2 class="text-xl font-bold text-white mb-4">Now Playing</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 lg:max-w-[70%]">
            {#each nowPlayingMovies as movie}
              <ContinueWatchingCard 
                movieId={movie.id}
                title={movie.title}
                imageUrl={movie.imageUrl?.startsWith('http') ? movie.imageUrl : getImageUrl(movie.imageUrl, 'w780')}
                progressPercentage={50}
                type={movie.type}
                on:play={openPlayer}
              />
            {/each}
        </div>
      </section>
    {/if}



    <section class="w-full max-w-[1600px] mx-auto px-[4%] mb-2">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-white">Top Rated Movies</h2>
        <button on:click={() => { currentPage = 'movies'; history.pushState({ page: 'movies' }, ''); }} class="text-sm font-medium text-text-muted hover:text-white transition-colors cursor-pointer">See more &rarr;</button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {#if isLoading}
          {#each Array(6) as _}
            <div class="aspect-2/3 rounded-lg bg-bg-elevated animate-pulse"></div>
          {/each}
        {:else}
          {#each topRatedMovies as movie}
            <MovieCard 
              movieId={movie.id}
              title={movie.title || movie.name}
              imageUrl={getImageUrl(movie.poster_path)}
              rating={movie.vote_average || 0}
              type={movie.media_type || 'Movie'}
              year={(movie.release_date || movie.first_air_date || '').substring(0, 4)}
              on:detail={openDetail}
            />
          {/each}
        {/if}
        </div>
      </section>

    <section class="w-full max-w-[1600px] mx-auto px-[4%] mb-2">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-white">Film Indonesia</h2>
        <button on:click={() => { currentPage = 'movies'; history.pushState({ page: 'movies' }, ''); }} class="text-sm font-medium text-text-muted hover:text-white transition-colors cursor-pointer">See more &rarr;</button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {#if isLoading}
          {#each Array(6) as _}
            <div class="aspect-2/3 rounded-lg bg-bg-elevated animate-pulse"></div>
          {/each}
        {:else}
          {#each indoMovies as movie}
            <MovieCard 
              movieId={movie.id}
              title={movie.title || movie.name}
              imageUrl={getImageUrl(movie.poster_path)}
              rating={movie.vote_average || 0}
              type={movie.media_type || 'Movie'}
              year={(movie.release_date || movie.first_air_date || '').substring(0, 4)}
              on:detail={openDetail}
            />
          {/each}
        {/if}
        </div>
      </section>
  </div>
  
  {/if}

  {#if currentPage !== 'login'}
    <footer class="w-full max-w-[1600px] mx-auto px-[4%] mt-12 pt-8 border-t border-white/10 text-center text-sm text-text-muted">
      <p>Moov Clone © {new Date().getFullYear()} - Built with Svelte + Tailwind + Vidking</p>
    </footer>
  {/if}
</main>

  <PlayerModal 
    show={showPlayer} 
    tmdbId={playerOptions?.id || ''} 
    mediaType={playerOptions?.type || 'movie'}
    season={playerOptions?.season}
    episode={playerOptions?.episode}
    on:close={closePlayer} 
  />
