<script lang="ts">
  import Hls from 'hls.js';
  // @ts-ignore
  import Plyr from 'plyr';
  import 'plyr/dist/plyr.css';
  import { onDestroy, onMount } from 'svelte';
  import type { StreamSource, Subtitle } from '../types/stream';

  export let sources: StreamSource[] = [];
  export let subtitles: Subtitle[] = [];
  
  let videoElement: HTMLVideoElement;
  let player: Plyr;
  let hls: Hls;

  function initPlayer() {
    if (!videoElement) return;

    const autoSource = sources.find(s => s.quality === 'auto' || s.quality === 'default' || s.url.includes('.m3u8')) || sources[0];
    if (!autoSource) return;

    if (player) {
      player.destroy();
    }
    if (hls) {
      hls.destroy();
    }

    const defaultOptions: any = {
      captions: { active: true, update: true, language: 'id' },
      keyboard: { focused: true, global: true },
      controls: [
        'play-large', 'rewind', 'play', 'fast-forward', 'progress', 
        'current-time', 'duration', 'mute', 'volume', 'captions', 
        'settings', 'pip', 'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed'],
    };

    // Cek apakah format video adalah HLS (.m3u8)
    if (autoSource.url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({ maxMaxBufferLength: 30 });
        hls.loadSource(autoSource.url);
        hls.attachMedia(videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          // Ambil semua resolusi, lalu urutkan dari yang terbesar (misal: 1080, 720, 480, 360, 0)
          const availableQualities = hls.levels.map((l) => l.height).sort((a, b) => b - a);
          availableQualities.push(0); // Tambahkan opsi Auto di paling bawah
          
          const qualityLabels: Record<number, string> = { 0: 'Auto' };
          
          // Memetakan resolusi aneh (misal 800p untuk film layar lebar) ke standar 1080p/720p
          hls.levels.forEach((l) => {
            let label = `${l.height}p`;
            if (l.width >= 1900) label = '1080p';
            else if (l.width >= 1200) label = '720p';
            else if (l.width >= 800) label = '480p';
            else if (l.width >= 600) label = '360p';
            
            qualityLabels[l.height] = label;
          });

          // Paksa mulai dari resolusi tertinggi agar tidak buram di awal
          const highestQuality = availableQualities[0];
          hls.startLevel = hls.levels.length - 1;
          hls.currentLevel = hls.levels.length - 1; // KUNCI di resolusi tertinggi (Non-aktifkan Auto)

          defaultOptions.quality = {
            default: highestQuality,
            options: availableQualities,
            forced: true,
            onChange: (newQuality: number) => {
              if (newQuality === 0) {
                hls.currentLevel = -1; // Auto di hls.js
              } else {
                hls.levels.forEach((level, index) => {
                  if (level.height === newQuality) {
                    hls.currentLevel = index;
                  }
                });
              }
            },
          };
          
          defaultOptions.i18n = {
            qualityBadge: {
              2160: '4K',
              1440: 'HD',
              1080: 'HD',
              720: 'HD',
              576: 'SD',
              480: 'SD',
            },
            qualityLabel: qualityLabels
          };

          player = new Plyr(videoElement, defaultOptions);
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback Safari
        videoElement.src = autoSource.url;
        player = new Plyr(videoElement, defaultOptions);
      }
    } else {
      // Jika format MP4 biasa
      videoElement.src = autoSource.url;
      player = new Plyr(videoElement, defaultOptions);
    }
  }
  let showContextMenu = false;
  let contextMenuPos = { x: 0, y: 0 };
  let lastRightClick = 0;
  let wrapperElement: HTMLDivElement;

  function handleContextMenu(e: MouseEvent) {
    const now = Date.now();
    // Jika klik kanan kedua dalam waktu kurang dari 800ms, biarkan browser menampilkan menu bawaan (native PiP dll)
    if (now - lastRightClick < 800) {
      showContextMenu = false;
    } else {
      // Klik kanan pertama: cegah menu bawaan dan tampilkan menu kustom
      e.preventDefault();
      if (wrapperElement) {
        const rect = wrapperElement.getBoundingClientRect();
        contextMenuPos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
      showContextMenu = true;
      lastRightClick = now;
    }
  }

  function hideContextMenu() {
    showContextMenu = false;
  }

  function toggleLoop() {
    if (player) {
      player.loop = !player.loop;
    }
    hideContextMenu();
  }

  function copyVideoUrl() {
    navigator.clipboard.writeText(window.location.href);
    hideContextMenu();
  }

  async function togglePiP() {
    hideContextMenu();
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled && videoElement) {
      await videoElement.requestPictureInPicture();
    }
  }

  let prevSourcesKey = '';
  $: if (sources && sources.length > 0 && videoElement) {
    const currentKey = sources.map(s => s.url).join('|');
    if (currentKey !== prevSourcesKey) {
      prevSourcesKey = currentKey;
      initPlayer();
    }
  }

  let hudMessage = '';
  let hudTimeout: any;

  function showHud(msg: string) {
    hudMessage = msg;
    clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => {
      hudMessage = '';
    }, 1200);
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ignore if typing in an input or textarea
    const activeEl = document.activeElement?.tagName.toLowerCase();
    if (activeEl === 'input' || activeEl === 'textarea' || activeEl === 'select') return;

    if (!player) return;

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        player.togglePlay();
        showHud(player.playing ? '▶ Diputar' : '⏸ Dijeda');
        break;
      case 'arrowleft':
      case 'j':
        e.preventDefault();
        player.currentTime = Math.max(0, player.currentTime - 10);
        showHud('⏪ -10 detik');
        break;
      case 'arrowright':
      case 'l':
        e.preventDefault();
        player.currentTime = Math.min(player.duration || 0, player.currentTime + 10);
        showHud('⏩ +10 detik');
        break;
      case 'arrowup':
        e.preventDefault();
        player.volume = Math.min(1, (player.volume || 1) + 0.05);
        showHud(`🔊 Volume ${Math.round(player.volume * 100)}%`);
        break;
      case 'arrowdown':
        e.preventDefault();
        player.volume = Math.max(0, (player.volume || 1) - 0.05);
        showHud(`🔉 Volume ${Math.round(player.volume * 100)}%`);
        break;
      case 'f':
        e.preventDefault();
        player.fullscreen.toggle();
        break;
      case 'm':
        e.preventDefault();
        player.muted = !player.muted;
        showHud(player.muted ? '🔇 Dibisukan' : `🔊 Volume ${Math.round(player.volume * 100)}%`);
        break;
      case 'c':
        e.preventDefault();
        player.toggleCaptions();
        showHud('💬 Subtitle Diganti');
        break;
    }
  }

  onMount(() => {
    initPlayer();
  });

  onDestroy(() => {
    clearTimeout(hudTimeout);
    if (player) player.destroy();
    if (hls) hls.destroy();
  });
</script>

<svelte:window on:click={hideContextMenu} on:keydown={handleKeydown} />

<!-- Mengatur tema Plyr menggunakan variabel CSS Plyr -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  bind:this={wrapperElement}
  class="w-full h-full flex items-center justify-center overflow-hidden bg-black shadow-2xl relative player-wrapper"
  on:contextmenu={handleContextMenu}
>
  <!-- On-Screen Keyboard Shortcut HUD -->
  {#if hudMessage}
    <div class="absolute z-50 pointer-events-none top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 text-white font-bold text-sm tracking-wide shadow-2xl animate-fade-in flex items-center gap-2">
      {hudMessage}
    </div>
  {/if}
  
  {#if showContextMenu}
    <div 
      class="absolute bg-bg-elevated/95 border border-white/10 rounded-xl py-2 min-w-48 z-100 text-sm shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      style="top: {contextMenuPos.y}px; left: {contextMenuPos.x}px;"
    >
      <button class="w-full text-left px-4 py-2 hover:bg-white/10 text-white transition-colors flex items-center gap-3" on:click={toggleLoop}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
        {player?.loop ? 'Matikan Pengulangan' : 'Ulangi Video'}
      </button>
      <button class="w-full text-left px-4 py-2 hover:bg-white/10 text-white transition-colors flex items-center gap-3" on:click={copyVideoUrl}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        Salin URL Video
      </button>
      <button class="w-full text-left px-4 py-2 hover:bg-white/10 text-white transition-colors flex items-center gap-3" on:click={togglePiP}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><rect x="12" y="11" width="8" height="5" rx="1" ry="1"></rect><polyline points="16 16 12 16 12 12"></polyline></svg>
        Picture-in-Picture
      </button>
    </div>
  {/if}

  <!-- Atribut crossorigin WAJIB agar subtitle bisa dimuat dari beda server -->
  <video bind:this={videoElement} playsinline crossorigin="anonymous" class="w-full h-full max-h-full">
    {#each subtitles as sub}
      <!-- Menyuntikkan track subtitle ke dalam video -->
      <!-- Jika labelnya 'Indonesian', kita set default -->
      <track 
        kind="captions" 
        label={sub.lang} 
        srclang={sub.lang.substring(0,2).toLowerCase()} 
        src={sub.url}
        default={sub.lang.toLowerCase().includes('indo') || sub.lang.includes('Lokal')}
      />
    {/each}
  </video>
</div>

<style>
  /* Menimpa warna default Plyr (Biru) menjadi Merah ala Netflix (brand-red) */
  .player-wrapper {
    --plyr-color-main: #e50914;
    --plyr-video-background: #000000;
    --plyr-font-family: 'Inter', sans-serif;
  }
  
  /* Pastikan Plyr benar-benar mengisi wrapper dan memposisikan video di tengah */
  :global(.plyr) {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  :global(.plyr__video-wrapper) {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  /* Memaksa tombol rewind dan fast-forward muncul di layar HP */
  :global(.plyr__controls [data-plyr="rewind"]),
  :global(.plyr__controls [data-plyr="fast-forward"]) {
    display: inline-flex !important;
  }
</style>
