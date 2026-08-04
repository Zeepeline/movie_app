<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { getStreamLinks } from '../lib/streamApi';
  import type { StreamData } from '../types/stream';
  import CustomPlayer from './CustomPlayer.svelte';

  export let show: boolean = false;
  export let tmdbId: string | number = "";
  export let mediaType: string = "movie";
  export let season: number | undefined = undefined;
  export let episode: number | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  let isMinimized = false;
  let isStreamLoading = false;
  let useFallbackIframe = false;
  let streamData: StreamData | null = null;
  
  // Subtitles State
  let showSubtitleModal = false;
  let isFetchingSubtitles = false;
  let subtitlesList: any[] = [];
  let imdbId: string | null = null;

  let selectedServer = 0;
  const servers = [
    { name: 'Server 1 (AutoEmbed - Default)', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s||1}-${e||1}` : `https://autoembed.co/movie/tmdb/${id}` },
    { name: 'Server 2 (Vidsrc - Best Subs)', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s||1}&episode=${e||1}` : `https://vidsrc.me/embed/movie?tmdb=${id}` },
    { name: 'Server 3 (Vidking)', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://www.vidking.net/embed/tv/${id}/${s||1}/${e||1}` : `https://www.vidking.net/embed/movie/${id}` }
  ];

  $: {
    if (show && tmdbId) {
      // Reset state saat membuka film baru
      subtitlesList = [];
      imdbId = null;
      showSubtitleModal = false;
      loadStream();
    } else if (!show) {
      // Reset state when closed
      streamData = null;
      useFallbackIframe = false;
      isStreamLoading = false;
      subtitlesList = [];
      imdbId = null;
      showSubtitleModal = false;
    }
  }

  async function loadStream() {
    isStreamLoading = true;
    useFallbackIframe = false;
    streamData = null;

    try {
      const data = await getStreamLinks(tmdbId, mediaType, season, episode);
      if (data) {
        streamData = data;
      } else {
        useFallbackIframe = true;
      }
    } catch (e) {
      useFallbackIframe = true;
    } finally {
      isStreamLoading = false;
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
        subtitlesList = data.subtitles.filter((s: any) => s.lang.toLowerCase() === 'ind' || s.lang.toLowerCase() === 'indonesian' || s.lang.toLowerCase() === 'id');
      }
    } catch(e) {
      console.error(e);
    } finally {
      isFetchingSubtitles = false;
    }
  }

  function close() {
    isMinimized = false;
    showSubtitleModal = false;
    dispatch('close');
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
  }

  let pipWindow: any = null;

  async function openNativePiP() {
    if (!('documentPictureInPicture' in window)) {
      let embedUrl = servers[selectedServer].getUrl(tmdbId, mediaType, season, episode);
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
      
      <!-- Cari Subtitle Button -->
      {#if !isMinimized}
        <button 
          class="text-white hover:text-brand-red bg-black/60 px-3 py-1.5 text-sm rounded-full backdrop-blur-md transition-colors flex items-center gap-1.5 mr-2 border border-white/20"
          on:click|stopPropagation={fetchSubtitles}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span class="font-medium">Cari Subtitle Indo</span>
        </button>
      {/if}

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
      {#if isStreamLoading}
        <div class="flex flex-col items-center justify-center w-full h-full text-white bg-black gap-4">
          <svg class="animate-spin h-10 w-10 text-brand-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="font-medium animate-pulse">Menghubungkan ke Server (Bypass Enkripsi)...</p>
        </div>
      {:else if streamData}
        <CustomPlayer sources={streamData.sources} subtitles={streamData.subtitles} />
      {:else if useFallbackIframe && tmdbId}
        <!-- SERVER SWITCHER -->
        {#if !isMinimized}
          <div class="absolute top-0 left-0 p-4 z-50">
            <select 
              class="bg-black/60 text-white text-sm py-1.5 px-3 rounded-lg border border-white/20 backdrop-blur-md focus:outline-none focus:border-brand-red cursor-pointer"
              bind:value={selectedServer}
            >
              {#each servers as server, i}
                <option value={i}>{server.name}</option>
              {/each}
            </select>
          </div>
        {/if}
        <!-- FALLBACK KE IFRAME -->
        <iframe 
          id="movie-iframe"
          src={servers[selectedServer].getUrl(tmdbId, mediaType, season, episode)} 
          title="Movie Player"
          class="w-full h-full border-0 pointer-events-auto"
          allow="picture-in-picture; fullscreen"
          allowfullscreen>
        </iframe>
      {:else}
        <div class="flex items-center justify-center w-full h-full text-white bg-black">
          <p>Terjadi kesalahan saat memuat video.</p>
        </div>
      {/if}

      <!-- Subtitle Search Results Overlay -->
      {#if showSubtitleModal && !isMinimized}
        <div class="absolute inset-y-0 right-0 w-80 bg-black/95 backdrop-blur-2xl border-l border-white/10 z-60 p-5 flex flex-col shadow-2xl transition-transform" transition:fade={{duration: 150}}>
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Subtitle Indo
            </h3>
            <button title="subtitile" on:click|stopPropagation={() => showSubtitleModal = false} class="text-white/50 hover:text-white bg-white/5 p-1.5 rounded-full transition-colors">
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
                <p class="text-white/70 text-sm">Subtitle Indonesia tidak ditemukan untuk video ini.</p>
              </div>
            {:else}
              <div class="space-y-3">
                {#each subtitlesList as sub, i}
                  <div class="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">File {i+1}</span>
                      <p class="text-white/80 text-xs font-medium truncate">ID: {sub.id}</p>
                    </div>
                    <a href={sub.url} target="_blank" class="flex items-center justify-center gap-2 w-full bg-white/10 text-white font-medium text-sm py-2 rounded border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Download .srt
                    </a>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
          
          <div class="mt-5 p-4 bg-brand-red/10 border border-brand-red/30 rounded-xl">
            <h4 class="text-brand-red font-bold text-sm mb-1">Cara Pakai:</h4>
            <ol class="text-xs text-white/70 leading-relaxed list-decimal list-inside space-y-1">
              <li>Klik tombol Download di atas</li>
              <li>Tunggu file (.srt) selesai diunduh</li>
              <li>Di dalam video player, klik tombol CC / Settings</li>
              <li>Pilih opsi "Upload / Load subtitle"</li>
              <li>Pilih file .srt yang baru didownload</li>
            </ol>
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
