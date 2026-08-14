<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import CategoryFilter from '../components/CategoryFilter.svelte';
  import MovieCard from '../components/MovieCard.svelte';
  import { getImageUrl, getMoviesByGenre } from '../lib/tmdb';

  const dispatch = createEventDispatcher();
  
  let selectedGenre: { id: number | null, name: string } = { id: null, name: 'All Movies' };
  let selectedYear: string = "";
  let selectedSort: string = "popularity.desc";
  let selectedRating: number | null = null;
  let genreMovies: any[] = [];
  let isGenreLoading = false;
  let genrePage = 1;
  let isLoadingMore = false;

  async function handleFilter(event: CustomEvent<{ genre: { id: number | null, name: string }, year: string, sortBy?: string, minRating?: number | null }>) {
    selectedGenre = event.detail.genre || selectedGenre;
    selectedYear = event.detail.year ?? selectedYear;
    selectedSort = event.detail.sortBy || selectedSort;
    selectedRating = event.detail.minRating !== undefined ? event.detail.minRating : selectedRating;
    isGenreLoading = true;
    genrePage = 1;
    
    try {
      genreMovies = await getMoviesByGenre(selectedGenre.id, genrePage, selectedYear, selectedSort, selectedRating);
    } catch(e) {
      console.error(e);
    } finally {
      isGenreLoading = false;
    }
  }

  // Initial load
  onMount(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleFilter(new CustomEvent('filter', { detail: { genre: selectedGenre, year: selectedYear, sortBy: selectedSort, minRating: selectedRating } }));
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
      const newMovies = await getMoviesByGenre(selectedGenre.id, genrePage, selectedYear, selectedSort, selectedRating);
      genreMovies = [...genreMovies, ...newMovies];
    } catch(e) {
      console.error("Gagal load more:", e);
    } finally {
      isLoadingMore = false;
    }
  }

  function handleDetail(event: CustomEvent<{ id: string | number }>) {
    dispatch('detail', { id: event.detail.id });
  }
</script>

<div class="w-full min-h-screen bg-bg-base text-white pb-16 pt-28 md:pt-24 animate-fade-in relative z-10">
  <div class="w-full max-w-[1600px] mx-auto px-[4%]">
    <div class="mb-10">
      <h1 class="text-3xl md:text-4xl font-bold mb-2">Explore Movies</h1>
      <p class="text-text-muted">Find your favorite movies by genre.</p>
    </div>

    <!-- The Filter -->
    <div class="mb-8">
      <CategoryFilter on:filter={handleFilter} />
    </div>

    <!-- The Grid -->
    <section class="w-full mb-8">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
        {#if isGenreLoading}
          {#each Array(12) as _}
            <div class="aspect-2/3 rounded-xl bg-bg-elevated shimmer border border-white/5 shadow-md"></div>
          {/each}
        {:else}
          {#each genreMovies as movie}
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
