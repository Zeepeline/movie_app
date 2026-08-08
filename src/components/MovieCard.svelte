<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let title: string = "Movie Title";
  export let imageUrl: string = "https://via.placeholder.com/300x450/333333/ffffff?text=Poster";
  export let movieId: number | string = "";
  export let rating: number = 0;
  export let type: string = "Movie";
  export let year: string = "";

  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('detail', { id: movieId, type });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<a 
  href={`/?movie=${movieId}&type=${type}`}
  class="relative rounded-xl overflow-hidden aspect-2/3 bg-bg-elevated cursor-pointer transition-transform duration-300 shadow-lg hover:scale-105 hover:z-10 hover:shadow-2xl group block"
  on:click|preventDefault={handleClick}
>
  <img src={imageUrl} alt={title} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
  
  <!-- Overlay Gradient -->
  <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100"></div>

  <!-- Content (Title, Type, Rating) -->
  <div class="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
    <h3 class="text-white font-bold text-sm sm:text-base leading-tight line-clamp-2 drop-shadow-md">{title}</h3>
    
    <div class="flex items-center flex-wrap gap-1 sm:gap-2 text-xs font-medium mt-0.5">
      <span class="bg-white/20 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded text-white/90 uppercase text-[9px] sm:text-[10px] tracking-wider">{type === 'tv' ? 'Series' : 'Movie'}</span>
      {#if year}
        <span class="text-white/70 text-[10px] sm:text-[11px] whitespace-nowrap">• {year}</span>
      {/if}
      {#if rating > 0}
        <span class="flex items-center gap-1 text-yellow-500 font-bold drop-shadow-md ml-auto text-[10px] sm:text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 sm:w-3.5 sm:h-3.5"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>
          {rating.toFixed(1)}
        </span>
      {/if}
    </div>
  </div>
</a>
