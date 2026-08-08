<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import CategoryFilter from '../components/CategoryFilter.svelte';
  import MovieCard from '../components/MovieCard.svelte';
  import { getTvSeriesByGenre, getImageUrl } from '../lib/tmdb';

  const dispatch = createEventDispatcher();
  
  let selectedGenre: { id: number | null, name: string } = { id: null, name: 'All Series' };
  let selectedYear: string = "";
  let genreSeries: any[] = [];
  let isGenreLoading = false;
  let genrePage = 1;
  let isLoadingMore = false;

  async function handleFilter(event: CustomEvent<{ genre: { id: number | null, name: string }, year: string }>) {
    selectedGenre = event.detail.genre;
    selectedYear = event.detail.year;
    isGenreLoading = true;
    genrePage = 1;
    
    try {
      genreSeries = await getTvSeriesByGenre(selectedGenre.id, genrePage, selectedYear);
    } catch(e) {
      console.error(e);
    } finally {
      isGenreLoading = false;
    }
  }

  // Initial load
  onMount(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleFilter(new CustomEvent('filter', { detail: { genre: selectedGenre, year: selectedYear } }));
  });

  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoadingMore && !isGenreLoading) {
        loadMore();
      }
    }, { rootMargin: '100px' });
    
    observer.observe(node);
    
    return {
      destroy() {
        observer.disconnect();
      }
    };
  }

  async function loadMore() {
    if (isLoadingMore) return;
    isLoadingMore = true;
    
    try {
      genrePage++;
      const newSeries = await getTvSeriesByGenre(selectedGenre.id, genrePage, selectedYear);
      genreSeries = [...genreSeries, ...newSeries];
    } catch(e) {
      console.error("Gagal load more:", e);
    } finally {
      isLoadingMore = false;
    }
  }

  function handleDetail(event: CustomEvent<{ id: string | number, type?: string }>) {
    // Explicitly set type to tv if it's not provided
    dispatch('detail', { id: event.detail.id, type: event.detail.type || 'tv' });
  }
</script>

<div class="w-full min-h-screen bg-bg-base text-white pb-16 pt-24 animate-fade-in relative z-10">
  <div class="w-full max-w-[1600px] mx-auto px-[4%]">
    <div class="mb-10">
      <h1 class="text-3xl md:text-4xl font-bold mb-2">Explore TV Series</h1>
      <p class="text-text-muted">Find your favorite TV shows by genre.</p>
    </div>

    <!-- The Filter -->
    <div class="mb-8">
      <!-- Note: We could use a specific TV CategoryFilter here, but reusing the existing one for now -->
      <CategoryFilter mediaType="tv" on:filter={handleFilter} />
    </div>

    <!-- The Grid -->
    <section class="w-full mb-8">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {#if isGenreLoading}
          {#each Array(12) as _}
            <div class="aspect-2/3 rounded-lg bg-bg-elevated animate-pulse"></div>
          {/each}
        {:else}
          {#each genreSeries as series}
            <MovieCard 
              movieId={series.id}
              title={series.title || series.name}
              imageUrl={getImageUrl(series.poster_path)}
              rating={series.vote_average || 0}
              type={'tv'}
              year={(series.release_date || series.first_air_date || '').substring(0, 4)}
              on:detail={handleDetail}
            />
          {/each}
        {/if}
      </div>
    </section>

    <!-- Infinite Scroll Sentinel -->
    <div use:infiniteScroll class="w-full flex justify-center py-8">
      {#if isLoadingMore}
        <div class="flex items-center gap-2 text-brand-red">
          <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="font-medium text-sm">Loading more...</span>
        </div>
      {/if}
    </div>
  </div>
</div>
