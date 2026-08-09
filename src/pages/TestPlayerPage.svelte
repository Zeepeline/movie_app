<script lang="ts">
  import CustomPlayer from '../components/CustomPlayer.svelte';
  import { fade } from 'svelte/transition';

  let streamUrl = "";
  let activeUrl = "";
  
  function handlePlay() {
    activeUrl = streamUrl;
  }
</script>

<div class="w-full min-h-screen bg-bg-base text-white pt-24 pb-16 px-[4%] animate-fade-in" in:fade>
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-2">HLS / M3U8 Player Tester</h1>
    <p class="text-text-muted mb-8">Paste tautan raw .m3u8 yang Anda dapatkan dari terminal ke bawah ini untuk membuktikan bahwa HLS.js bisa memutarnya tanpa iklan.</p>
    
    <div class="flex gap-4 mb-8">
      <input 
        type="text" 
        bind:value={streamUrl}
        placeholder="Paste link .m3u8 di sini..."
        class="flex-1 bg-bg-elevated border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red transition-colors"
      />
      <button 
        on:click={handlePlay}
        class="bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
      >
        Play
      </button>
    </div>

    {#if activeUrl}
      <div class="h-[50vh] bg-black rounded-lg overflow-hidden border border-zinc-800 relative">
        <CustomPlayer 
          sources={[{ url: activeUrl, isM3U8: activeUrl.includes('.m3u8'), quality: 'auto' }]} 
          subtitles={[]} 
        />
      </div>
      <p class="mt-4 text-sm text-green-400 font-mono break-all">
        Memutar: {activeUrl}
      </p>
    {:else}
      <div class="w-full aspect-video bg-bg-elevated rounded-xl flex items-center justify-center border border-white/10 border-dashed">
        <p class="text-text-muted">Video player akan muncul di sini</p>
      </div>
    {/if}
  </div>
</div>
