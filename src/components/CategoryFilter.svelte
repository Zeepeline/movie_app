<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getGenres } from '../lib/tmdb';

  const dispatch = createEventDispatcher();
  
  let categories: { id: number | null, name: string }[] = [
    { id: null, name: "All Popular" }
  ];
  let activeIndex = 0;

  onMount(async () => {
    try {
      const fetchedGenres = await getGenres();
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

  function selectCategory(index: number) {
    activeIndex = index;
    dispatch('select', categories[index]);
  }
</script>

<div class="my-8 mx-auto relative w-full max-w-[1600px] px-[4%]">
  <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
    {#each categories as category, i}
      <button 
        class={`whitespace-nowrap px-5 py-2 rounded-full font-medium text-sm transition-colors ${i === activeIndex ? 'bg-white text-black' : 'bg-bg-elevated text-text-muted hover:bg-white/30 hover:text-white'}`}
        on:click={() => selectCategory(i)}
      >
        {category.name}
      </button>
    {/each}
  </div>
</div>
