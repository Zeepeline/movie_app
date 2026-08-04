<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { getImageUrl } from '../lib/tmdb';
  
  export let movies: any[] = [];

  const dispatch = createEventDispatcher();
  let currentIndex = 0;
  let timer: ReturnType<typeof setInterval>;

  $: currentMovie = movies[currentIndex] || {};
  $: title = currentMovie.title || currentMovie.name || '';
  $: description = currentMovie.overview || '';
  $: coverUrl = getImageUrl(currentMovie.backdrop_path, 'original');
  $: movieId = currentMovie.id || '';

  function next() {
    if (movies.length > 0) {
      currentIndex = (currentIndex + 1) % movies.length;
    }
  }

  function prev() {
    if (movies.length > 0) {
      currentIndex = (currentIndex - 1 + movies.length) % movies.length;
    }
  }

  function goTo(index: number) {
    currentIndex = index;
    resetTimer();
  }

  function startTimer() {
    timer = setInterval(next, 6000);
  }

  function resetTimer() {
    clearInterval(timer);
    startTimer();
  }

  onMount(() => {
    if (movies.length > 1) startTimer();
  });

  onDestroy(() => {
    clearInterval(timer);
  });

  function handlePlay() {
    dispatch('play', { 
      id: movieId,
      type: currentMovie.media_type || 'movie',
      title: title,
      imageUrl: coverUrl
    });
  }
</script>

{#if movies.length > 0}
  <div class="relative h-[80vh] min-h-125 flex items-center rounded-b-[30px] overflow-hidden group">
    
    <!-- Background Carousel -->
    {#key currentIndex}
      <div class="absolute inset-0 -z-10" transition:fade={{ duration: 800 }}>
        <img src={coverUrl} alt={title} class="w-full h-full object-cover object-center" />
        <div class="absolute inset-0 bg-linear-to-r from-bg-base/90 via-bg-base/40 to-transparent"></div>
        <div class="absolute inset-0 bg-linear-to-t from-bg-base via-transparent to-transparent"></div>
      </div>
    {/key}

    <div class="w-full max-w-[1600px] mx-auto px-[4%] relative z-10 pt-20">
      <div class="max-w-full md:max-w-125">
        <!-- Content Transition -->
        <div class="grid">
          {#key currentIndex}
            <div 
              class="col-start-1 row-start-1"
              in:fly={{ y: 30, duration: 600, delay: 300 }} 
              out:fade={{ duration: 300 }}
            >
              <h1 class="text-3xl md:text-4xl lg:text-6xl font-extrabold mb-3 md:mb-4 leading-tight drop-shadow-lg">{title}</h1>
              <p class="text-sm md:text-base text-gray-200 mb-6 md:mb-8 max-w-full md:max-w-100 leading-relaxed line-clamp-3 drop-shadow-md">{description}</p>
            </div>
          {/key}
        </div>
        
        <div class="flex gap-4">
          <button on:click={handlePlay} class="rounded-full px-6 py-2.5 font-semibold text-[0.95rem] inline-flex items-center justify-center gap-2 transition-colors bg-white text-black hover:bg-white/80">
            <span>Watch Now</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <button 
            class="rounded-full px-6 py-2.5 font-semibold text-[0.95rem] inline-flex items-center justify-center gap-2 transition-colors bg-white/15 text-white backdrop-blur-md hover:bg-white/25 border border-white/10"
            on:click={() => dispatch('detail', { id: movieId, type: currentMovie.media_type || 'movie' })}
          >
            <span>Details</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Carousel Controls & Indicators -->
    {#if movies.length > 1}
      <div class="absolute bottom-8 right-[4%] flex items-center gap-4 z-20">
        <!-- Prev Button -->
        <button 
          class="w-10 h-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10 opacity-0 group-hover:opacity-100"
          on:click={() => { prev(); resetTimer(); }}
          aria-label="Previous movie"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <!-- Indicators -->
        <div class="flex gap-2">
          {#each movies as _, i}
            <button 
              class={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-brand-red' : 'w-2 bg-white/40 hover:bg-white/70'}`}
              on:click={() => goTo(i)}
              aria-label={`Go to movie ${i + 1}`}
            ></button>
          {/each}
        </div>

        <!-- Next Button -->
        <button 
          class="w-10 h-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10 opacity-0 group-hover:opacity-100"
          on:click={() => { next(); resetTimer(); }}
          aria-label="Next movie"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    {/if}
  </div>
{/if}
