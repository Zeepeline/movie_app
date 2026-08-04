<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Plyr from 'plyr';
  import 'plyr/dist/plyr.css';
  import Hls from 'hls.js';
  import type { StreamSource, Subtitle } from '../lib/streamApi';

  export let sources: StreamSource[] = [];
  export let subtitles: Subtitle[] = [];
  
  let videoElement: HTMLVideoElement;
  let player: Plyr;
  let hls: Hls;

  onMount(() => {
    if (!videoElement) return;

    const autoSource = sources.find(s => s.quality === 'auto' || s.quality === 'default' || s.url.includes('.m3u8')) || sources[0];
    if (!autoSource) return;

    // Menginisialisasi Plyr (Tampilan bergaya modern/Netflix)
    player = new Plyr(videoElement, {
      captions: { active: true, update: true, language: 'id' },
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'duration', 
        'mute', 'volume', 'captions', 'settings', 'pip', 'fullscreen'
      ],
      settings: ['captions', 'quality', 'speed'],
    });

    // Cek apakah format video adalah HLS (.m3u8)
    if (autoSource.url.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
            // Konfigurasi performa HLS
            maxMaxBufferLength: 30,
        });
        hls.loadSource(autoSource.url);
        hls.attachMedia(videoElement);
        
        // Opsional: Langsung Play setelah berhasil dimuat
        // hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback khusus untuk browser Safari yang mendukung HLS secara native
        videoElement.src = autoSource.url;
      }
    } else {
      // Jika format MP4 biasa
      videoElement.src = autoSource.url;
    }
  });

  onDestroy(() => {
    if (player) player.destroy();
    if (hls) hls.destroy();
  });
</script>

<!-- Mengatur tema Plyr menggunakan variabel CSS Plyr -->
<div class="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl relative player-wrapper">
  <!-- Atribut crossorigin WAJIB agar subtitle bisa dimuat dari beda server -->
  <video bind:this={videoElement} playsinline crossorigin="anonymous" class="w-full h-full">
    {#each subtitles as sub}
      <!-- Menyuntikkan track subtitle ke dalam video -->
      <!-- Jika labelnya 'Indonesian', kita set default -->
      <track 
        kind="captions" 
        label={sub.lang} 
        srclang={sub.lang.substring(0,2).toLowerCase()} 
        src={sub.url}
        default={sub.lang.toLowerCase().includes('indo')}
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
</style>
