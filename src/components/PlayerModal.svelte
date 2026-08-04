<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  export let show: boolean = false;
  export let tmdbId: string | number = "";
  export let mediaType: string = "movie";
  export let season: number | undefined = undefined;
  export let episode: number | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  let isMinimized = false;

  function close() {
    isMinimized = false;
    dispatch('close');
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
  }

  let pipWindow: any = null;

  async function openNativePiP() {
    if (!('documentPictureInPicture' in window)) {
      let embedUrl = `https://www.vidking.net/embed/${mediaType}/${tmdbId}`;
      if (mediaType === 'tv' && season !== undefined && episode !== undefined) {
        embedUrl = `https://www.vidking.net/embed/tv/${tmdbId}/${season}/${episode}`;
      } else if (mediaType === 'tv') {
        // Fallback default for TV
        embedUrl = `https://www.vidking.net/embed/tv/${tmdbId}/1/1`;
      }
      // Fallback: Buka di jendela Popup biasa karena browser tidak support Native PiP
      window.open(embedUrl, 'MoviePiP', 'width=480,height=270,left=200,top=200,menubar=no,toolbar=no,location=no,status=no');
      close();
      return;
    }

    try {
      // @ts-ignore
      pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 270
      });

      const iframe = document.getElementById('movie-iframe');
      if (!iframe) return;

      const originalParent = iframe.parentElement;

      // Reset styling di window baru
      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.style.padding = "0";
      pipWindow.document.body.style.backgroundColor = "black";
      pipWindow.document.body.style.width = "100vw";
      pipWindow.document.body.style.height = "100vh";
      pipWindow.document.body.style.overflow = "hidden";
      
      // Pindahkan iframe (akan merefresh video karena pindah DOM document)
      pipWindow.document.body.appendChild(iframe);

      // Kembalikan saat jendela PiP ditutup
      pipWindow.addEventListener("pagehide", () => {
        if (originalParent && iframe) {
          originalParent.appendChild(iframe);
        }
        pipWindow = null;
      });

    } catch (error) {
      console.error("Gagal membuka PiP:", error);
    }
  }

  // Prevent scrolling on body when modal is open FULL SCREEN
  $: {
    if (typeof window !== 'undefined') {
      if (show && !isMinimized && !pipWindow) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed z-100 transition-all duration-500 ease-in-out {isMinimized ? 'bottom-6 right-6 w-100 aspect-video rounded-xl shadow-2xl overflow-hidden group' : 'inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm'}" 
    transition:fade={{ duration: 200 }} 
    on:click={!isMinimized ? close : undefined}
  >
    <!-- Controls wrapper (visible on hover if minimized) -->
    <div class="absolute top-0 right-0 p-4 flex gap-3 z-50 transition-opacity duration-300 {isMinimized ? 'opacity-0 group-hover:opacity-100 bg-linear-to-b from-black/80 to-transparent w-full justify-end' : ''}">
      
      <!-- Native OS PiP Button -->
      <button 
        class="text-white hover:text-brand-red bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors" 
        on:click|stopPropagation={openNativePiP} 
        aria-label="Native OS PiP"
        title="Pop Out (OS PiP)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M13 13h6v6h-6z"></path><path d="M13 3v6"></path><path d="M21 9h-8"></path></svg>
      </button>

      <!-- Minimize / Maximize Button -->
      <button 
        class="text-white hover:text-brand-red bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors" 
        on:click|stopPropagation={toggleMinimize} 
        aria-label={isMinimized ? "Maximize" : "Minimize"}
      >
        {#if isMinimized}
          <!-- Maximize Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        {:else}
          <!-- Minimize Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        {/if}
      </button>

      <!-- Close Button -->
      <button 
        class="text-white hover:text-brand-red bg-black/60 p-2 rounded-full backdrop-blur-md transition-colors" 
        on:click|stopPropagation={close} 
        aria-label="Close modal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="relative w-full h-full bg-black overflow-hidden {isMinimized ? '' : 'rounded-none shadow-2xl'}" on:click|stopPropagation role="presentation">
      {#if tmdbId}
        <iframe 
          id="movie-iframe"
          src={mediaType === 'tv' ? `https://www.vidking.net/embed/tv/${tmdbId}/${season || 1}/${episode || 1}` : `https://www.vidking.net/embed/movie/${tmdbId}`} 
          title="Movie Player"
          class="w-full h-full border-0 pointer-events-auto"
          allow="picture-in-picture; fullscreen"
          allowfullscreen>
        </iframe>
      {:else}
        <div class="flex items-center justify-center w-full h-full text-white">
          <p>Loading player...</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
