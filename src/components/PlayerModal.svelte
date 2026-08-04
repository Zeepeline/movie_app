<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';


  export let show: boolean = false;
  export let tmdbId: string | number = "";
  export let mediaType: string = "movie";
  export let season: number | undefined = undefined;
  export let episode: number | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  // Subtitles State
  let showSubtitleModal = false;
  let isFetchingSubtitles = false;
  let subtitlesList: any[] = [];
  let imdbId: string | null = null;

  // Auto-hide controls
  let isControlsVisible = true;
  let controlsTimeout: ReturnType<typeof setTimeout>;

  function resetControlsTimeout() {
    isControlsVisible = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (!showSubtitleModal) {
        isControlsVisible = false;
      }
    }, 4000);
  }
  let selectedServer = 0;
  const servers = [
    { name: 'VidLink', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidlink.pro/tv/${id}/${s||1}/${e||1}` : `https://vidlink.pro/movie/${id}` },
    { name: 'Vidfast', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s||1}&episode=${e||1}` : `https://vidsrc.me/embed/movie?tmdb=${id}` },
    { name: '111Movies', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s||1}-${e||1}` : `https://autoembed.co/movie/tmdb/${id}` },
    { name: 'Videasy', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s||1}/${e||1}` : `https://vidsrc.to/embed/movie/${id}` }
  ];

  let prevTmdbId: string | number = "";
  $: {
    if (show && tmdbId && tmdbId !== prevTmdbId) {
      // Reset state saat membuka film baru
      prevTmdbId = tmdbId;
      subtitlesList = [];
      imdbId = null;
      showSubtitleModal = false;
      resetControlsTimeout();
    } else if (!show) {
      // Reset state when closed
      subtitlesList = [];
      imdbId = null;
      showSubtitleModal = false;
      prevTmdbId = "";
      clearTimeout(controlsTimeout);
    }
  }

  async function fetchImdbId() {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      if (mediaType === 'movie') {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}`);
        const data = await res.json();
        imdbId = data.imdb_id;
      } else {
        const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/external_ids?api_key=${apiKey}`);
        const data = await res.json();
        imdbId = data.imdb_id;
      }
    } catch (e) {
      console.error("Failed to fetch IMDB ID", e);
    }
  }

  async function fetchSubtitles() {
    showSubtitleModal = true;
    resetControlsTimeout();
    if (subtitlesList.length > 0) return; // Already fetched

    isFetchingSubtitles = true;
    try {
      if (!imdbId) await fetchImdbId();
      if (!imdbId) {
        isFetchingSubtitles = false;
        return;
      }
      
      let url = `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;
      if (mediaType === 'tv') {
        url = `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season||1}:${episode||1}.json`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.subtitles) {
        subtitlesList = data.subtitles;
      }
    } catch(e) {
      console.error(e);
    } finally {
      isFetchingSubtitles = false;
    }
  }

  function close() {
    showSubtitleModal = false;
    clearTimeout(controlsTimeout);
    dispatch('close');
  }

  // Prevent scrolling on body when modal is open
  $: {
    if (typeof window !== 'undefined') {
      if (show) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    }
  }

  function getLanguageName(code: string) {
    if (!code) return 'Unknown';
    const map: Record<string, string> = {
      'ind': 'Indonesia', 'id': 'Indonesia',
      'eng': 'English', 'en': 'English',
      'spa': 'Spanyol', 'es': 'Spanyol',
      'fre': 'Prancis', 'fr': 'Prancis',
      'ger': 'Jerman', 'de': 'Jerman',
      'jpn': 'Jepang', 'ja': 'Jepang',
      'kor': 'Korea', 'ko': 'Korea',
      'chi': 'Mandarin', 'zho': 'Mandarin', 'zh': 'Mandarin',
      'ara': 'Arab', 'ar': 'Arab',
      'rus': 'Rusia', 'ru': 'Rusia',
      'por': 'Portugis', 'pt': 'Portugis',
      'ita': 'Italia', 'it': 'Italia',
      'hin': 'Hindi', 'hi': 'Hindi',
      'tha': 'Thailand', 'th': 'Thailand',
      'vie': 'Vietnam', 'vi': 'Vietnam',
      'msa': 'Melayu', 'ms': 'Melayu', 'may': 'Melayu',
      'tur': 'Turki', 'tr': 'Turki',
      'pol': 'Polandia', 'pl': 'Polandia',
      'nld': 'Belanda', 'nl': 'Belanda', 'dut': 'Belanda',
      'swe': 'Swedia', 'sv': 'Swedia'
    };
    const norm = code.toLowerCase();
    return map[norm] || code.toUpperCase();
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed z-100 inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-all duration-500 ease-in-out" 
    transition:fade={{ duration: 200 }} 
    on:click={close}
  >
    <div class="relative w-full h-full bg-black overflow-hidden rounded-none shadow-2xl" on:click|stopPropagation role="presentation">
      
      <!-- VIDEO PLAYER (IFRAME ONLY) -->
      {#if tmdbId}
        <iframe 
          id="movie-iframe"
          src={servers[selectedServer].getUrl(tmdbId, mediaType, season, episode)} 
          title="Movie Player"
          class="w-full h-full border-0 pointer-events-auto bg-black"
          allow="picture-in-picture; fullscreen"
          allowfullscreen>
        </iframe>
      {:else}
        <div class="flex items-center justify-center w-full h-full text-white bg-black">
          <p>Memuat...</p>
        </div>
      {/if}

      <!-- PULL-DOWN HANDLE TO WAKE UP CONTROLS (VISIBLE WHEN CONTROLS ARE HIDDEN) -->
      {#if !isControlsVisible}
        <button 
          class="absolute top-4 left-1/2 -translate-x-1/2 z-65 py-2 px-6 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white/70 hover:text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 animate-bounce"
          on:click|stopPropagation={resetControlsTimeout}
          aria-label="Show controls"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      {/if}

      <!-- 4. CONTROLS OVERLAY (AUTO-HIDES AFTER 4 SECONDS OR GLASSMORPHISM) -->
      <div 
        class="pointer-events-none absolute top-0 left-0 w-full p-4 flex flex-col md:flex-row justify-between items-start gap-3 transition-all duration-500 ease-in-out {isControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}"
        style="z-index: 60;"
      >
        
        <!-- LEFT SIDE: Server Switcher -->
        {#if tmdbId}
          <div class="pointer-events-auto flex items-center gap-2 p-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] overflow-x-auto custom-scrollbar max-w-[90vw] md:max-w-[70%]" on:mouseenter={resetControlsTimeout}>
            <div class="flex items-center gap-2 px-3 border-r border-white/20 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-red"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
              <span class="text-white/90 text-xs font-bold uppercase tracking-widest hidden sm:inline">Server</span>
            </div>
            <div class="flex gap-2 px-1">
              {#each servers as server, i}
                <button 
                  class="shrink-0 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-300 {selectedServer === i ? 'bg-linear-to-r from-brand-red to-red-500 text-white shadow-[0_4px_12px_rgba(229,9,20,0.4)] border border-transparent' : 'text-white/70 hover:bg-white/10 hover:text-white border border-transparent hover:border-white/20'}"
                  on:click|stopPropagation={() => { selectedServer = i; resetControlsTimeout(); }}
                >
                  {server.name}
                </button>
              {/each}
            </div>
          </div>
        {:else}
          <div></div> <!-- Spacer -->
        {/if}

        <!-- RIGHT SIDE: Action Buttons -->
        <div class="pointer-events-auto flex gap-2 p-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] shrink-0 self-end md:self-auto" on:mouseenter={resetControlsTimeout}>
          <!-- Cari Subtitle Button -->
          <button 
            class="text-white/80 hover:text-brand-red hover:bg-white/10 px-3 py-1.5 text-sm rounded-xl transition-colors flex items-center gap-1.5"
            on:click|preventDefault|stopPropagation={fetchSubtitles}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span class="font-medium hidden sm:inline">Subtitle</span>
          </button>
          <div class="w-px bg-white/20 my-1 mx-1"></div>

          <!-- Close Button -->
          <button 
            class="text-white/80 hover:text-brand-red hover:bg-brand-red/20 p-2 rounded-xl transition-colors" 
            on:click|stopPropagation={close} 
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <!-- Subtitle Search Results Overlay -->
      {#if showSubtitleModal}
        <div class="absolute inset-0 bg-black/40 pointer-events-none z-65"></div>
        <div class="absolute inset-y-0 right-0 w-85 bg-black/80 backdrop-blur-2xl border-l border-white/10 p-6 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform" style="z-index: 70;" transition:fade={{duration: 150}}>
          <div class="flex justify-between items-center mb-8">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-red"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Cari Subtitle
            </h3>
            <button title="Tutup" on:click|stopPropagation={() => { showSubtitleModal = false; resetControlsTimeout(); }} class="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {#if isFetchingSubtitles}
              <div class="flex flex-col items-center justify-center py-12 gap-3">
                <svg class="animate-spin h-8 w-8 text-brand-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p class="text-white/50 text-sm">Mencari di OpenSubtitles...</p>
              </div>
            {:else if subtitlesList.length === 0}
              <div class="text-center py-10 bg-white/5 rounded-xl border border-white/10">
                <p class="text-white/70 text-sm">Subtitle tidak ditemukan untuk video ini.</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each subtitlesList as sub}
                  <div class="flex flex-col p-3 rounded-2xl bg-white/3 hover:bg-white/8 border border-white/5 transition-all duration-300 hover:border-brand-red/30 hover:shadow-[0_8px_30px_rgba(229,9,20,0.15)]">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2.5">
                        <span class="text-white/90 text-sm font-semibold">{getLanguageName(sub.lang)}</span>
                      </div>
                      
                      <a href={sub.url} target="_blank" title="Download Subtitle" class="flex items-center justify-center shrink-0 bg-white/5 hover:bg-brand-red text-white/70 hover:text-white p-2.5 rounded-xl border border-white/10 hover:border-brand-red transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      </a>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
