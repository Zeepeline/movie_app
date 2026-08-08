<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getGenres } from '../lib/tmdb';

  const dispatch = createEventDispatcher();
  
  export let mediaType: 'movie' | 'tv' = 'movie';
  export let showGenres: boolean = true;

  let categories: { id: number | null, name: string }[] = [
    { id: null, name: "All Popular" }
  ];
  let activeIndex = 0;
  
  let selectedYear: string = "";
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => (currentYear - i).toString());

  onMount(async () => {
    try {
      const fetchedGenres = await getGenres(mediaType);
      if (fetchedGenres && fetchedGenres.length > 0) {
        categories = [
          { id: null, name: "All Popular" },
          ...fetchedGenres.map((g: any) => ({ id: g.id, name: g.name }))
        ];
      }
    } catch (e) {
      console.error(e);
    }
  });

  function handleYearChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedYear = target.value;
    dispatch('filter', { genre: categories[activeIndex], year: selectedYear });
  }

  function selectCategory(index: number) {
    activeIndex = index;
    dispatch('filter', { genre: categories[index], year: selectedYear });
  }
</script>

<div class="relative w-full flex flex-col sm:flex-row gap-4 items-start sm:items-center">
  {#if showGenres}
    <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar flex-1 w-full">
      {#each categories as category, i}
        <button 
          class={`shrink-0 px-5 py-2 rounded-full font-medium text-sm transition-colors ${i === activeIndex ? 'bg-white text-black shadow-lg shadow-white/20' : 'bg-bg-elevated text-text-muted hover:bg-white/10 hover:text-white'}`}
          on:click={() => selectCategory(i)}
        >
          {category.name}
        </button>
      {/each}
    </div>
  {:else}
    <div class="flex-1 w-full"></div>
  {/if}
  
  <div class="flex items-center gap-3 shrink-0 pb-2">
    <label for="year-select" class="text-sm font-medium text-text-muted">Year:</label>
    <div class="relative">
      <select 
        id="year-select"
        class="appearance-none bg-bg-elevated text-white border border-white/10 rounded-full pl-4 pr-10 py-2 text-sm outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 cursor-pointer transition-colors hover:bg-white/5"
        on:change={handleYearChange}
        bind:value={selectedYear}
      >
        <option value="">All Years</option>
        {#each years as year}
          <option value={year}>{year}</option>
        {/each}
      </select>
      <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/50">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
</div>
