<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { watchlistStore } from '../store/watchlist';
  import type { WatchlistItem } from '../types/watchlist';
  import { getImageUrl } from '../lib/tmdb';
  import MovieCard from '../components/MovieCard.svelte';

  const dispatch = createEventDispatcher();
  let items: WatchlistItem[] = [];

  const unsubscribe = watchlistStore.subscribe(value => {
    items = value;
  });

  onMount(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return unsubscribe;
  });

  function handleBack() {
    dispatch('back');
  }

  function handleDetail(event: CustomEvent<{ id: string | number }>) {
    dispatch('detail', { id: event.detail.id });
  }
</script>

<div class="w-full min-h-[80vh] bg-bg-base text-white pb-16 pt-24 animate-fade-in relative z-10">
  <div class="w-full max-w-[1600px] mx-auto px-[4%]">
    <!-- Back Button -->
    <button 
      class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
      on:click={handleBack}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      <span>Back to Home</span>
    </button>

    <div class="mb-10">
      <h1 class="text-3xl md:text-4xl font-bold mb-2">My Watchlist</h1>
      <p class="text-text-muted">Movies and series you want to watch later.</p>
    </div>

    {#if items.length === 0}
      <div class="flex flex-col items-center justify-center py-20 bg-bg-elevated/30 rounded-2xl border border-white/5 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-white/20 mb-6"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        <h3 class="text-xl font-bold mb-2">Your watchlist is empty</h3>
        <p class="text-text-muted max-w-sm mb-6">Add movies and series to your watchlist to keep track of what you want to watch.</p>
        <button 
          class="rounded-full px-6 py-2.5 font-bold text-sm transition-colors bg-white text-black hover:bg-white/90"
          on:click={handleBack}
        >
          Explore Movies
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
        {#each items as item}
          <MovieCard 
            movieId={item.id}
            title={item.title}
            imageUrl={getImageUrl(item.poster_path)}
            rating={item.vote_average || 0}
            type={item.media_type || 'Movie'}
            year={(item.release_date || '').substring(0, 4)}
            on:detail={handleDetail}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>
