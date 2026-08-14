<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import MovieCard from '../components/MovieCard.svelte';
  import CategoryFilter from '../components/CategoryFilter.svelte';
  import { getImageUrl, getKidsMovies } from '../lib/tmdb';

  const dispatch = createEventDispatcher();
  
  let movies: any[] = [];
  let isLoading = false;
  let page = 1;
  let isLoadingMore = false;
  let selectedYear: string = "";

  async function handleFilter(event?: CustomEvent<{ year: string }>) {
    if (event) {
      selectedYear = event.detail.year;
    }
    
    isLoading = true;
    page = 1;
    try {
      movies = await getKidsMovies(page, selectedYear);
    } catch(e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleFilter();
  });

  function infiniteScroll(node: HTMLElement) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isLoadingMore && !isLoading) {
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
      page++;
      const newMovies = await getKidsMovies(page, selectedYear);
      movies = [...movies, ...newMovies];
    } catch(e) {
      console.error("Gagal load more:", e);
    } finally {
      isLoadingMore = false;
    }
  }

  function handleDetail(event: CustomEvent<{ id: string | number }>) {
    dispatch('detail', { id: event.detail.id, type: 'movie' });
  }
</script>

<div class="w-full min-h-screen bg-bg-base text-white pb-16 pt-28 md:pt-24 animate-fade-in relative z-10">
  <div class="w-full max-w-[1600px] mx-auto px-[4%]">
    <div class="mb-10">
      <h1 class="text-3xl md:text-4xl font-bold mb-2">Kids & Family</h1>
      <p class="text-text-muted">Fun movies and shows for the whole family.</p>
    </div>

    <!-- The Filter -->
    <div class="mb-8">
      <CategoryFilter showGenres={false} on:filter={handleFilter} />
    </div>

    <!-- The Grid -->
    <section class="w-full mb-8">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {#if isLoading}
          {#each Array(12) as _}
            <div class="aspect-2/3 rounded-xl bg-bg-elevated shimmer border border-white/5 shadow-md"></div>
          {/each}
        {:else}
          {#each movies as movie}
            <MovieCard 
              movieId={movie.id}
              title={movie.title || movie.name}
              imageUrl={getImageUrl(movie.poster_path)}
              rating={movie.vote_average || 0}
              type={movie.media_type || 'Movie'}
              year={(movie.release_date || movie.first_air_date || '').substring(0, 4)}
              on:detail={handleDetail}
            />
          {/each}
        {/if}
      </div>
    </section>

    <!-- Infinite Scroll Sentinel -->
    <div use:infiniteScroll class="w-full py-6">
      {#if isLoadingMore}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6 w-full">
          {#each Array(6) as _}
            <div class="aspect-2/3 rounded-xl bg-bg-elevated shimmer border border-white/5 shadow-md"></div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
