<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { removeFromHistory } from '../store/history';

  export let title: string = "Movie Title";
  export let imageUrl: string = "https://via.placeholder.com/400x225/333333/ffffff?text=Poster";
  export let movieId: number | string = "";
  export let type: string = "movie";

  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('play', { 
      id: movieId,
      type: type,
      title: title,
      imageUrl: imageUrl
    });
  }

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();
    removeFromHistory(movieId);
    dispatch('remove', { id: movieId });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="group relative rounded-xl overflow-hidden aspect-video bg-bg-elevated cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-md hover:shadow-xl"
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <img src={imageUrl} alt={title} class="w-full h-full object-cover" loading="lazy" />
  
  <!-- Overlay Gradient -->
  <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent"></div>

  <!-- Delete Button (Top Right) -->
  <button 
    class="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-brand-red text-white/80 hover:text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
    on:click|stopPropagation={handleRemove}
    title="Hapus dari Continue Watching"
    aria-label="Hapus dari Continue Watching"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>

  <!-- Play Icon in Center -->
  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div class="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="translate-x-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
    </div>
  </div>

  <!-- Title & Type in Bottom -->
  <div class="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 pointer-events-none">
    <p class="text-xs sm:text-sm font-bold text-white leading-tight truncate drop-shadow-md">{title}</p>
    <span class="text-[10px] text-white/70 uppercase tracking-wider font-semibold">{type === 'tv' ? 'Series' : 'Movie'}</span>
  </div>
</div>
