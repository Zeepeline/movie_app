<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let title: string = "Movie Title";
  export let imageUrl: string = "https://via.placeholder.com/400x225/333333/ffffff?text=Poster";
  export let progressPercentage: number = 45;
  export let movieId: number | string = "";

  const dispatch = createEventDispatcher();
  
  function handleClick() {
    dispatch('play', { id: movieId });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="group relative rounded-xl overflow-hidden aspect-video bg-bg-elevated cursor-pointer transition-transform duration-300 hover:scale-[1.03]"
  on:click={handleClick}
  role="button"
  tabindex="0"
>
  <img src={imageUrl} alt={title} class="w-full h-full object-cover" loading="lazy" />
  
  <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
    <button class="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-200 group-hover:scale-110" aria-label="Play">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
    </button>
  </div>

  <div class="absolute bottom-0 left-0 w-full h-1 bg-white/20">
    <div class="h-full bg-brand-red" style="width: {progressPercentage}%"></div>
  </div>
</div>
