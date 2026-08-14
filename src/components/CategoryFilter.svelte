<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getGenres } from '../lib/tmdb';

  const dispatch = createEventDispatcher();
  
  export let mediaType: 'movie' | 'tv' = 'movie';
  export let showGenres: boolean = true;

  let categories: { id: number | null, name: string }[] = [
    { id: null, name: "All Genres" }
  ];
  let activeIndex = 0;
  
  let selectedYear: string = "";
  let selectedSort: string = "popularity.desc";
  let selectedRating: string = "";

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  onMount(async () => {
    try {
      const fetchedGenres = await getGenres(mediaType);
      if (fetchedGenres && fetchedGenres.length > 0) {
        categories = [
          { id: null, name: "All Genres" },
          ...fetchedGenres.map((g: any) => ({ id: g.id, name: g.name }))
        ];
      }
    } catch (e) {
      console.error(e);
    }
  });

  function emitFilterChange() {
    dispatch('filter', { 
      genre: categories[activeIndex], 
      year: selectedYear,
      sortBy: selectedSort,
      minRating: selectedRating ? parseFloat(selectedRating) : null
    });
  }

  function handleFilterChange() {
    emitFilterChange();
  }

  function selectCategory(index: number) {
    activeIndex = index;
    emitFilterChange();
  }
</script>

<div class="relative w-full flex flex-col gap-4">
  {#if showGenres}
    <!-- Genre Pills Horizontal Scroll -->
    <div class="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar w-full">
      {#each categories as category, i}
        <button 
          class={`shrink-0 px-4 py-2 rounded-full font-medium text-xs sm:text-sm transition-all cursor-pointer ${i === activeIndex ? 'bg-white text-black shadow-lg shadow-white/20 font-bold' : 'bg-bg-elevated text-text-muted hover:bg-white/10 hover:text-white border border-white/5'}`}
          on:click={() => selectCategory(i)}
        >
          {category.name}
        </button>
      {/each}
    </div>
  {/if}
  
  <!-- Advanced Filter Controls (Sort, Rating, Year) -->
  <div class="flex flex-wrap items-center gap-3 pt-1">
    <!-- Sort By -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-text-muted">Urutkan:</span>
      <div class="relative">
        <select 
          class="appearance-none bg-bg-elevated text-white text-xs font-medium border border-white/10 rounded-xl pl-3 pr-8 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red cursor-pointer transition-colors hover:bg-white/5"
          on:change={handleFilterChange}
          bind:value={selectedSort}
        >
          <option value="popularity.desc">🔥 Terpopuler</option>
          <option value="vote_average.desc">⭐ Rating Tertinggi</option>
          <option value={mediaType === 'tv' ? 'first_air_date.desc' : 'primary_release_date.desc'}>📅 Rilis Terbaru</option>
          <option value="vote_count.desc">👥 Ulasan Terbanyak</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-white/50">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>

    <!-- Rating Filter -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-text-muted">Rating:</span>
      <div class="relative">
        <select 
          class="appearance-none bg-bg-elevated text-white text-xs font-medium border border-white/10 rounded-xl pl-3 pr-8 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red cursor-pointer transition-colors hover:bg-white/5"
          on:change={handleFilterChange}
          bind:value={selectedRating}
        >
          <option value="">Semua Rating</option>
          <option value="8.0">⭐ 8.0+ (Sangat Bagus)</option>
          <option value="7.0">⭐ 7.0+ (Bagus)</option>
          <option value="6.0">⭐ 6.0+ (Cukup)</option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-white/50">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>

    <!-- Year Filter -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-text-muted">Tahun:</span>
      <div class="relative">
        <select 
          class="appearance-none bg-bg-elevated text-white text-xs font-medium border border-white/10 rounded-xl pl-3 pr-8 py-2 outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red cursor-pointer transition-colors hover:bg-white/5"
          on:change={handleFilterChange}
          bind:value={selectedYear}
        >
          <option value="">Semua Tahun</option>
          {#each years as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-white/50">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
    </div>
  </div>
</div>
