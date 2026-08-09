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

  onMount(() => {
    initPlayer();
  });

  onDestroy(() => {
    if (player) player.destroy();
    if (hls) hls.destroy();
  });
</script>

<!-- Mengatur tema Plyr menggunakan variabel CSS Plyr -->
<div class="w-full h-full flex items-center justify-center overflow-hidden bg-black shadow-2xl relative player-wrapper">
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
