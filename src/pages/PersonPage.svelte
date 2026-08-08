<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { getPersonDetail, getPersonCredits, getImageUrl } from '../lib/tmdb';
  import MovieCard from '../components/MovieCard.svelte';

  export let personId: string | number;

  const dispatch = createEventDispatcher();

  let person: any = null;
  let credits: any[] = [];
  let isLoading = true;

  onMount(() => {
    fetchPersonData();
  });

  // Fetch data if personId changes (e.g. navigation)
  $: if (personId) {
    fetchPersonData();
  }

  async function fetchPersonData() {
    isLoading = true;
    try {
      const [detailData, creditsData] = await Promise.all([
        getPersonDetail(personId),
        getPersonCredits(personId)
      ]);
      
      person = detailData;
      
      // Get acting roles, sort by popularity or release date
      if (creditsData && creditsData.cast) {
        // Filter out items without poster or release date, then sort by release date descending
        credits = creditsData.cast
          .filter((c: any) => c.poster_path && (c.release_date || c.first_air_date))
          .sort((a: any, b: any) => {
            const dateA = new Date(a.release_date || a.first_air_date || '1970-01-01').getTime();
            const dateB = new Date(b.release_date || b.first_air_date || '1970-01-01').getTime();
            return dateB - dateA;
          });
      }
    } catch (error) {
      console.error("Error fetching person data:", error);
    } finally {
      isLoading = false;
    }
  }

  function handleBack() {
    dispatch('back');
  }

  function handleMovieClick(event: CustomEvent) {
    dispatch('detail', event.detail);
  }
</script>

{#if isLoading}
  <div class="w-full h-screen flex items-center justify-center bg-bg-base">
    <div class="animate-spin h-10 w-10 border-4 border-brand-red border-t-transparent rounded-full"></div>
  </div>
{:else if person}
  <div class="w-full min-h-screen bg-bg-base text-white pb-16 pt-20 animate-fade-in relative z-10">
    <div class="w-full max-w-[1600px] mx-auto px-[4%]">
      <!-- Back Button -->
      <button 
        class="inline-flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 hover:-translate-x-1 mb-8 bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/5"
        on:click={handleBack}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        <span class="font-medium text-sm">Kembali</span>
      </button>

      <!-- Actor Info Section -->
      <div class="flex flex-col md:flex-row gap-8 lg:gap-12 mb-16">
        <!-- Profile Picture -->
        <div class="w-full md:w-1/3 lg:w-1/4 shrink-0">
          <div class="rounded-2xl overflow-hidden shadow-2xl aspect-2/3 bg-bg-elevated border border-white/10">
            {#if person.profile_path}
              <img src={getImageUrl(person.profile_path, 'w780')} alt={person.name} class="w-full h-full object-cover" />
            {:else}
              <div class="w-full h-full flex flex-col items-center justify-center text-white/30 p-4 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Foto tidak tersedia</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Bio Details -->
        <div class="flex flex-col flex-1">
          <h1 class="text-4xl md:text-5xl font-extrabold mb-2">{person.name}</h1>
          
          <div class="flex flex-wrap items-center gap-4 text-sm font-medium text-white/80 mb-6">
            {#if person.known_for_department}
              <span class="bg-white/10 px-3 py-1 rounded-full text-xs">{person.known_for_department}</span>
            {/if}
            {#if person.birthday}
              <span>Lahir: {person.birthday}</span>
            {/if}
            {#if person.place_of_birth}
              <span class="text-white/50">•</span>
              <span>{person.place_of_birth}</span>
            {/if}
            {#if person.deathday}
              <span class="text-white/50">•</span>
              <span>Wafat: {person.deathday}</span>
            {/if}
          </div>

          {#if person.biography}
            <div class="prose prose-invert max-w-none">
              <h3 class="text-xl font-bold mb-3">Biografi</h3>
              <p class="text-white/70 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                {person.biography}
              </p>
            </div>
          {:else}
            <p class="text-white/50 italic">Biografi belum tersedia untuk aktor ini.</p>
          {/if}
        </div>
      </div>

      <!-- Known For / Credits Section -->
      {#if credits.length > 0}
        <div class="mt-12">
          <h2 class="text-2xl font-bold mb-6 flex items-center gap-3">
            Filmografi
            <span class="text-sm font-normal text-white/50 bg-white/10 px-3 py-1 rounded-full">{credits.length} Judul</span>
          </h2>
          
          <div class="relative border-l-2 border-white/10 ml-4 md:ml-6 mt-8 space-y-6 pb-12">
            {#each credits as movie, index}
              {@const currentYear = (movie.release_date || movie.first_air_date || 'TBA').substring(0, 4)}
              {@const prevYear = index > 0 ? (credits[index - 1].release_date || credits[index - 1].first_air_date || 'TBA').substring(0, 4) : null}
              
              {#if currentYear !== prevYear}
                <div class="relative pl-8 md:pl-12 pt-6 pb-2">
                  <div class="absolute -left-2.75 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-bg-base border-4 border-brand-red z-10 shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
                  <div class="flex items-center gap-4">
                    <h3 class="text-2xl md:text-3xl font-black text-white/90 tracking-wider shrink-0">{currentYear}</h3>
                    <div class="h-px flex-1 bg-white/10 mt-1 rounded-full"></div>
                  </div>
                </div>
              {/if}

              <button 
                class="relative pl-8 md:pl-12 group text-left w-full block" 
                on:click={() => dispatch('detail', { id: movie.id, type: movie.media_type })}
              >
                <!-- Timeline Dot -->
                <div class="absolute -left-1.5 top-6 w-3 h-3 rounded-full bg-white/20 group-hover:bg-brand-red group-hover:scale-150 transition-all duration-300"></div>
                
                <!-- Content Card -->
                <div class="flex items-start gap-4 md:gap-6 bg-white/5 hover:bg-white/10 p-3 md:p-4 rounded-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 transform group-hover:-translate-y-1 group-hover:shadow-xl">
                  <!-- Small Poster -->
                  <div class="w-16 md:w-20 aspect-2/3 shrink-0 rounded-lg overflow-hidden bg-bg-elevated shadow-md">
                    <img src={getImageUrl(movie.poster_path, 'w500')} alt={movie.title || movie.name} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  
                  <!-- Text details -->
                  <div class="flex-1 flex flex-col justify-center py-1 overflow-hidden">
                    <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span class="text-brand-red font-bold text-xs md:text-sm bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-md">
                        {(movie.release_date || movie.first_air_date || 'TBA').substring(0, 4)}
                      </span>
                      <span class="text-white/50 text-[10px] md:text-xs px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-widest font-semibold">{movie.media_type === 'tv' ? 'Series' : 'Movie'}</span>
                      {#if movie.vote_average > 0}
                        <span class="flex items-center gap-1 text-yellow-500 font-bold text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>
                          {movie.vote_average.toFixed(1)}
                        </span>
                      {/if}
                    </div>
                    <h3 class="text-base md:text-xl font-bold text-white group-hover:text-brand-red transition-colors mb-1 truncate">
                      {movie.title || movie.name}
                    </h3>
                    {#if movie.character}
                      <p class="text-white/60 text-xs md:text-sm italic truncate">
                        sebagai <span class="text-white font-medium">{movie.character}</span>
                      </p>
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <div class="w-full h-screen flex flex-col items-center justify-center text-white bg-bg-base">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-brand-red mb-4"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    <p class="text-xl font-medium mb-4">Gagal memuat data aktor</p>
    <button 
      class="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      on:click={handleBack}
    >
      Kembali
    </button>
  </div>
{/if}
