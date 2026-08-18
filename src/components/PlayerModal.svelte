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
  
  // Subtitles State
  let showSubtitleModal = false;
  let isFetchingSubtitles = false;
  let subtitlesList: any[] = [];
  let imdbId: string | null = null;
  
  // Downloads State
  let showDownloadModal = false;
  let isFetchingDownloads = false;
  let downloadsList: any[] = [];

  // Stream State
  let streamData: StreamData | null = null;
  let isFetchingStream = false;

  let iframeElement: HTMLIFrameElement;
  let isControlsVisible = true;
  let controlsTimeout: ReturnType<typeof setTimeout>;

  // Jebakan Anti-Redirect: Mencegah Iframe membajak dan mengalihkan halaman utama
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (show && selectedServer > 0) {
      e.preventDefault();
      e.returnValue = ''; // Wajib untuk Chrome lama
      return '';
    }
  }

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
  let isForceLandscape = false;
  const servers = [
    { name: 'IrmintulStream (Aether Proxy)', getUrl: () => '' },
    { name: 'Cinejoy (4K / 1080p Ultra HD)', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://cinejoy.to/watch/tv/${id}/${s||1}/${e||1}` : `https://cinejoy.to/watch/movie/${id}` },
    { name: 'VidLink (Ultra Fast HD)', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidlink.pro/tv/${id}/${s||1}/${e||1}?autoplay=1` : `https://vidlink.pro/movie/${id}?autoplay=1` },
    { name: '111Movies', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://autoembed.co/tv/tmdb/${id}-${s||1}-${e||1}?autoplay=1` : `https://autoembed.co/movie/tmdb/${id}?autoplay=1` },
    { name: 'Vidfast', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidsrc.me/embed/tv/${id}/${s||1}/${e||1}` : `https://vidsrc.me/embed/movie/${id}` },
    { name: 'Videasy', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s||1}/${e||1}` : `https://vidsrc.to/embed/movie/${id}` },
    { name: 'SuperEmbed', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s||1}&e=${e||1}&autoplay=1` : `https://multiembed.mov/?video_id=${id}&tmdb=1&autoplay=1` },
    { name: 'SmashyStream', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://player.smashy.stream/tv/?tmdb=${id}&season=${s||1}&episode=${e||1}&autoplay=1` : `https://player.smashy.stream/movie/?tmdb=${id}&autoplay=1` },
    { name: '2Embed', getUrl: (id: string | number, type: string, s?: number, e?: number) => type === 'tv' ? `https://www.2embed.cc/embedtv/${id}&s=${s||1}&e=${e||1}&autoplay=1` : `https://www.2embed.cc/embed/${id}?autoplay=1` },
  ];

  let prevPlaybackKey = "";
  $: {
    const currentKey = `${tmdbId}-${season}-${episode}`;
    if (show && tmdbId && currentKey !== prevPlaybackKey) {
      // Reset state saat membuka film/episode baru
      prevPlaybackKey = currentKey;
      subtitlesList = [];
      downloadsList = [];
      showSubtitleModal = false;
      showDownloadModal = false;
      
      // Layar rotasi mobile dihilangkan atas permintaan pengguna
      isForceLandscape = false;
      
      resetControlsTimeout();
      
      // Kembalikan ke server default (IrmintulStream) saat membuka film baru
      selectedServer = 0; 
      
      fetchSubtitles(true); // Auto-fetch silent
      fetchStreamData();
    } else if (!show) {
      // Reset state when closed
      subtitlesList = [];
      downloadsList = [];
      streamData = null;
      imdbId = null;
      showSubtitleModal = false;
      showDownloadModal = false;
      isForceLandscape = false;
      prevPlaybackKey = "";
      clearTimeout(controlsTimeout);
    }
  }

  function nextEpisode() {
    if (mediaType !== 'tv') return;
    episode = (episode || 1) + 1;
    resetControlsTimeout();
  }
  
  function prevEpisode() {
    if (mediaType !== 'tv') return;
    if ((episode || 1) > 1) {
      episode = (episode || 1) - 1;
      resetControlsTimeout();
    }
  }

  async function fetchStreamData() {
    if (selectedServer !== 0) return; // Hanya fetch jika servernya IrmintulStream

    isFetchingStream = true;
    streamData = null;
    
    try {
      // 1. Ambil langsung stream dari Aether via getStreamLinks
      const result = await getStreamLinks(tmdbId, mediaType, season, episode);
      if (result && result.sources && result.sources.length > 0) {
        streamData = result;
        isFetchingStream = false;
        return;
      }

      // 2. Fallback: Ekosistem Addon Stremio jika Aether belum memiliki stream
      if (!imdbId) await fetchImdbId();
      
      if (imdbId) {
        try {
          const addons = [
            "https://mediafusion.elfhosted.com",
            "https://shluflix.elfhosted.com"
          ];
          
          const stremioPromises = addons.map(async (baseUrl) => {
            const url = mediaType === 'tv' 
              ? `${baseUrl}/stream/series/${imdbId}:${season||1}:${episode||1}.json`
              : `${baseUrl}/stream/movie/${imdbId}.json`;
              
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 detik batas waktu
            
            try {
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (!res.ok) throw new Error("Addon failed");
              const data = await res.json();
              
              if (data && data.streams && data.streams.length > 0) {
                const httpStream = data.streams.find((s: any) => s.url && s.url.startsWith('http'));
                if (httpStream) {
                  return {
                    sources: [{
                      url: httpStream.url,
                      isM3U8: httpStream.url.includes('.m3u8'),
                      quality: httpStream.name || 'auto'
                    }],
                    subtitles: []
                  };
                }
              }
              throw new Error("No HTTP streams found");
            } catch (err) {
              clearTimeout(timeoutId);
              throw err;
            }
          });

          streamData = await Promise.any(stremioPromises);
        } catch (stremioError) {
          console.warn("Stremio Addons fallback gagal:", stremioError);
        }
      }
    } catch(e) {
      console.error("Error fetching stream:", e);
    } finally {
      isFetchingStream = false;
    }
  }

  // Reactive listener untuk memicu fetchStreamData jika user memilih IrmintulStream secara manual
  function handleServerChange(event: Event) {
    if (selectedServer === 0 && !streamData && !isFetchingStream) {
      fetchStreamData();
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

  async function fetchSubtitles(silent = false) {
    if (!silent) {
      showSubtitleModal = true;
      resetControlsTimeout();
    }
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
        // Filter only Indonesian and English, and take top 5 to avoid slow loading
        const filteredSubs = data.subtitles.filter((s: any) => {
          const l = (s.lang || '').toLowerCase();
          return l === 'ind' || l === 'id' || l === 'in' || l === 'eng' || l === 'en' || l.includes('indo');
        }).slice(0, 8);
        
        const processedSubs = [];
        for (const sub of filteredSubs) {
          try {
            const subRes = await fetch(sub.url);
            const text = await subRes.text();
            
            let vttText = text;
            if (!text.startsWith('WEBVTT')) {
              vttText = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
            }
            
            const blob = new Blob([vttText], { type: 'text/vtt' });
            const l = (sub.lang || '').toLowerCase();
            const isIndo = l === 'ind' || l === 'id' || l === 'in' || l.includes('indo');
            processedSubs.push({
              lang: isIndo ? 'Indonesian' : 'English',
              url: URL.createObjectURL(blob)
            });
          } catch(e) {
            console.error("Gagal mengonversi subtitle:", e);
          }
        }
        
        subtitlesList = processedSubs;
      }
    } catch(e) {
      console.error(e);
    } finally {
      isFetchingSubtitles = false;
    }
  }

  async function fetchDownloads() {
    showDownloadModal = true;
    showSubtitleModal = false;
    resetControlsTimeout();
    
    if (downloadsList.length > 0) return; // Already fetched

    isFetchingDownloads = true;
    try {
      if (!imdbId) await fetchImdbId();
      if (!imdbId) {
        isFetchingDownloads = false;
        return;
      }
      
      let url = `https://torrentio.strem.fun/stream/movie/${imdbId}.json`;
      if (mediaType === 'tv') {
        url = `https://torrentio.strem.fun/stream/series/${imdbId}:${season||1}:${episode||1}.json`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data && data.streams) {
        downloadsList = data.streams.filter((s: any) => s.infoHash); // only magnet links
      }
    } catch(e) {
      console.error(e);
    } finally {
      isFetchingDownloads = false;
    }
  }

  function close() {
    showSubtitleModal = false;
    showDownloadModal = false;
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

<svelte:window on:beforeunload={handleBeforeUnload} />

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="fixed z-100 inset-0 flex items-center justify-center bg-black transition-all duration-500 ease-in-out" 
    transition:fade={{ duration: 200 }} 
    on:click={close}
  >
    <div 
      class="relative bg-black overflow-hidden rounded-none shadow-2xl transition-all duration-300" 
      style={isForceLandscape ? "width: 100vh; height: 100vw; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(90deg);" : "width: 100%; height: 100%;"}
      on:click|stopPropagation role="presentation"
    >
      
      <!-- VIDEO PLAYER ATAU IFRAME -->
      {#if selectedServer === 0}
        {#if isFetchingStream}
          <div class="flex flex-col items-center justify-center w-full h-full text-white bg-black p-6">
            <div class="w-full max-w-xl aspect-video rounded-3xl bg-white/5 shimmer border border-white/10 flex flex-col items-center justify-center p-8 relative overflow-hidden shadow-2xl">
              <div class="w-16 h-16 rounded-full bg-white/10 shimmer flex items-center justify-center mb-4 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="text-brand-red ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
              <div class="w-52 h-4 rounded-full bg-white/10 shimmer mb-2.5"></div>
              <div class="w-36 h-3 rounded-full bg-white/5 shimmer"></div>
            </div>
          </div>
        {:else if streamData}
          <div class="w-full h-full bg-black flex flex-col justify-center">
             <CustomPlayer sources={streamData.sources} subtitles={subtitlesList} />
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center w-full h-full text-white bg-black px-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-white/40 mb-3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p class="text-lg font-bold mb-1">Stream Tidak Tersedia di IrmintulStream</p>
            <p class="text-white/50 text-sm max-w-md mb-6">Judul ini belum tersedia di CDN Aether. Silakan gunakan server alternatif berikut:</p>
            <div class="flex flex-wrap items-center justify-center gap-3">
              <button 
                class="px-5 py-2.5 bg-brand-red hover:bg-brand-red/80 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg cursor-pointer"
                on:click={() => selectedServer = 1}
              >
                Putar via 111Movies
              </button>
              <button 
                class="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                on:click={() => selectedServer = 2}
              >
                Putar via VidLink
              </button>
            </div>
          </div>
        {/if}
      {:else if selectedServer === 1 && tmdbId}
        <!-- TAMPILAN KHUSUS SERVER CINEJOY DENGAN DIRECT LAUNCH -->
        <div class="flex flex-col items-center justify-center w-full h-full text-white bg-gradient-to-b from-gray-950 via-black to-gray-950 px-4 text-center">
          <div class="w-20 h-20 rounded-3xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center mb-5 shadow-[0_0_50px_rgba(229,9,20,0.25)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-red"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
          <h3 class="text-2xl font-bold mb-2 tracking-tight">Cinejoy Ultra HD Player</h3>
          <p class="text-white/60 text-sm max-w-md mb-6 leading-relaxed">
            Menyediakan kualitas streaming tertinggi <strong class="text-white font-semibold">4K & 1080p Full HD</strong> tanpa iklan mengganggu.
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a 
              href={servers[1].getUrl(tmdbId, mediaType, season, episode)}
              target="_blank" 
              rel="noopener noreferrer"
              class="px-6 py-3 bg-brand-red hover:bg-brand-red/90 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-xl shadow-brand-red/30 flex items-center gap-2 hover:scale-105 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              Putar di Cinejoy (Tab Baru)
            </a>
            <button 
              class="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              on:click={() => selectedServer = 0}
            >
              Kembali ke Player Utama
            </button>
          </div>
        </div>
      {:else if tmdbId}
        <iframe 
          id="movie-iframe"
          src={servers[selectedServer].getUrl(tmdbId, mediaType, season, episode)} 
          title="Movie Player"
          class="w-full h-full border-0 pointer-events-auto bg-black"
          allow="autoplay; picture-in-picture; fullscreen"
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
        class="pointer-events-none absolute top-0 left-0 w-full p-4 flex justify-end items-start transition-all duration-500 ease-in-out {isControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}"
        style="z-index: 60;"
      >
        <div class="pointer-events-auto flex items-center gap-1.5 sm:gap-2 p-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]" on:mouseenter={resetControlsTimeout}>
          
          {#if tmdbId}
            <!-- Server Dropdown -->
            <div class="relative flex items-center shrink-0">
              <div class="absolute left-2.5 pointer-events-none text-brand-red">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
              </div>
              <select 
                class="appearance-none bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs sm:text-sm font-medium py-2 pl-8 pr-7 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red cursor-pointer transition-colors max-w-30 sm:max-w-none text-ellipsis"
                bind:value={selectedServer}
                on:change={handleServerChange}
              >
                {#each servers as server, i}
                  <option value={i} class="bg-bg-elevated text-white">{server.name}</option>
                {/each}
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-white/50">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            
            <div class="w-px h-5 bg-white/20 mx-0.5"></div>
          {/if}

          <!-- Rotate Button (Mobile Only) -->
          <button 
            class="md:hidden text-white/80 hover:text-brand-red hover:bg-white/10 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
            on:click|preventDefault|stopPropagation={() => { isForceLandscape = !isForceLandscape; resetControlsTimeout(); }}
            title="Putar Layar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.45l5.36 5.36"/></svg>
            <span class="font-medium hidden sm:inline">Putar</span>
          </button>
          
          <div class="md:hidden w-px h-5 bg-white/20 mx-0.5"></div>

          {#if mediaType === 'tv'}
            <!-- Prev/Next Episode -->
            <div class="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/5">
              <button 
                class="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                on:click|stopPropagation={prevEpisode}
                disabled={(episode || 1) <= 1}
                title="Episode Sebelumnya"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 20L9 12l10-8v16z"/><line x1="5" y1="19" x2="5" y2="5"/></svg>
              </button>
              <span class="text-xs font-bold text-white/70 px-1">E{episode || 1}</span>
              <button 
                class="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                on:click|stopPropagation={nextEpisode}
                title="Episode Selanjutnya"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l10 8-10 8V4z"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
              </button>
            </div>
            
            <div class="w-px h-5 bg-white/20 mx-0.5"></div>
          {/if}

          <!-- Cari Subtitle Button -->
          <button 
            class="text-white/80 hover:text-brand-red hover:bg-white/10 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 {subtitlesList.length > 0 ? 'text-brand-red' : ''}"
            on:click|preventDefault|stopPropagation={() => fetchSubtitles()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span class="font-medium hidden sm:inline">Subtitle {subtitlesList.length > 0 ? `(${subtitlesList.length})` : ''}</span>
          </button>

          <div class="w-px h-5 bg-white/20 mx-0.5"></div>

          <!-- Download Button -->
          <button 
            class="text-white/80 hover:text-brand-red hover:bg-white/10 px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 {downloadsList.length > 0 ? 'text-brand-red' : ''}"
            on:click|preventDefault|stopPropagation={() => fetchDownloads()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span class="font-medium hidden sm:inline">Download</span>
          </button>

          <div class="w-px h-5 bg-white/20 mx-0.5"></div>

          <!-- Close Button -->
          <button 
            class="text-white/80 hover:text-brand-red hover:bg-brand-red/20 p-1.5 sm:p-2 rounded-xl transition-colors shrink-0" 
            on:click|stopPropagation={close} 
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
              <div class="space-y-3 py-2">
                {#each Array(4) as _}
                  <div class="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div class="w-28 h-5 rounded-lg bg-white/10 shimmer"></div>
                    <div class="w-8 h-8 rounded-xl bg-white/10 shimmer"></div>
                  </div>
                {/each}
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
                      
                      <a 
                        href={sub.url} 
                        download={`subtitle_${sub.lang.toLowerCase()}_${tmdbId}.vtt`} 
                        title="Download Subtitle (.vtt)" 
                        class="flex items-center justify-center shrink-0 bg-white/5 hover:bg-brand-red text-white/70 hover:text-white p-2.5 rounded-xl border border-white/10 hover:border-brand-red transition-all duration-300"
                        on:click|stopPropagation
                      >
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

      <!-- Torrent Download Results Overlay -->
      {#if showDownloadModal}
        <div class="absolute inset-0 bg-black/40 pointer-events-none z-65"></div>
        <div class="absolute inset-y-0 right-0 w-85 sm:w-96 bg-black/80 backdrop-blur-2xl border-l border-white/10 p-6 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform" style="z-index: 70;" transition:fade={{duration: 150}}>
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-red"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download via Torrent
            </h3>
            <button title="Tutup" on:click|stopPropagation={() => { showDownloadModal = false; resetControlsTimeout(); }} class="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="bg-brand-red/10 border border-brand-red/20 rounded-xl p-3 mb-4">
            <p class="text-xs text-white/80">
              Pastikan Anda memiliki aplikasi torrent client seperti <strong class="text-white">qBittorrent</strong> atau <strong class="text-white">uTorrent</strong> untuk membuka tautan magnet ini.
            </p>
          </div>
          
          <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {#if isFetchingDownloads}
              <div class="space-y-3 py-2">
                {#each Array(4) as _}
                  <div class="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <div class="w-3/4 h-4 rounded bg-white/10 shimmer"></div>
                    <div class="w-1/2 h-3 rounded bg-white/10 shimmer"></div>
                    <div class="flex justify-end gap-2 pt-1">
                      <div class="w-20 h-7 rounded-lg bg-white/10 shimmer"></div>
                      <div class="w-20 h-7 rounded-lg bg-white/10 shimmer"></div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else if downloadsList.length === 0}
              <div class="text-center py-10 bg-white/5 rounded-xl border border-white/10">
                <p class="text-white/70 text-sm">Link download tidak ditemukan untuk film ini.</p>
              </div>
            {:else}
              <div class="space-y-3">
                {#each downloadsList as stream}
                  <div class="flex flex-col p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300">
                    <div class="flex flex-col gap-1 mb-2">
                      <span class="text-white font-medium text-sm wrap-break-word leading-snug">{stream.title.split('\n')[0]}</span>
                      <span class="text-brand-red text-xs font-bold">{stream.name}</span>
                      <span class="text-white/60 text-xs">{stream.title.split('\n').slice(1).join(' | ')}</span>
                    </div>
                    <div class="flex justify-end mt-2 gap-2 flex-wrap">
                      <a 
                        href={`https://webtor.io/show?magnet=${encodeURIComponent(`magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(stream.title.split('\n')[0])}`)}`}
                        target="_blank"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                        on:click|stopPropagation
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Web Download
                      </a>
                      <a 
                        href={`magnet:?xt=urn:btih:${stream.infoHash}&dn=${encodeURIComponent(stream.title.split('\n')[0])}`}
                        class="px-4 py-2 bg-brand-red hover:bg-brand-red/80 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                        on:click|stopPropagation
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        Buka App
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
