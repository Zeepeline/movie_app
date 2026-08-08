<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getImageUrl, searchMovies } from '../lib/tmdb';
  import { logout, user } from '../store/auth';

  export let currentPage: string = 'home';

  const dispatch = createEventDispatcher();
  let isScrolled = false;
  let isSearchOpen = false;
  let isProfileOpen = false;
  let searchQuery = '';
  let searchResults: any[] = [];
  let isSearching = false;
  let searchTimeout: any;

  onMount(() => {
    const handleScroll = () => {
      isScrolled = window.scrollY > 10;
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });

  $: {
    if (searchQuery.trim().length > 2) {
      clearTimeout(searchTimeout);
      isSearching = true;
      searchTimeout = setTimeout(async () => {
        searchResults = await searchMovies(searchQuery);
        isSearching = false;
      }, 500);
    } else {
      searchResults = [];
      isSearching = false;
    }
  }

  function handleDetail(id: number) {
    dispatch('detail', { id });
    isSearchOpen = false;
    searchQuery = '';
  }

  function handleWatchlistClick() {
    dispatch('openWatchlist');
    isProfileOpen = false;
  }
</script>

<nav class={`fixed top-0 left-0 w-full z-50 transition-all duration-300 py-6 bg-linear-to-b from-black/80 to-transparent ${isScrolled ? 'py-4 bg-black/85 backdrop-blur-xl border-b border-white/5' : ''}`}>
  <div class="w-full max-w-[1600px] mx-auto px-[4%] flex items-center justify-between">
    <div class="flex items-center gap-4 lg:gap-12">
      <div class="flex items-center mr-0 sm:mr-4">
        <svg viewBox="0 0 100 30" class="w-16 sm:w-20 h-5 sm:h-6">
          <path d="M0,30 L10,0 L25,0 L35,20 L45,0 L60,0 L70,30 L55,30 L48,15 L42,30 L30,30 L23,15 L15,30 Z" fill="white"/>
          <circle cx="85" cy="15" r="12" fill="none" stroke="white" stroke-width="4"/>
          <circle cx="115" cy="15" r="12" fill="none" stroke="white" stroke-width="4"/>
        </svg>
      </div>
      
      <ul class="hidden md:flex list-none gap-8">
        <li><button on:click={() => dispatch('navigate', { page: 'home' })} class={`text-sm font-medium transition-colors ${currentPage === 'home' ? 'text-white' : 'text-text-muted hover:text-white'}`}>Home</button></li>
        <li><button on:click={() => dispatch('navigate', { page: 'movies' })} class={`text-sm font-medium transition-colors ${currentPage === 'movies' ? 'text-white' : 'text-text-muted hover:text-white'}`}>Movies</button></li>
        <li><button on:click={() => dispatch('navigate', { page: 'series' })} class={`text-sm font-medium transition-colors ${currentPage === 'series' ? 'text-white' : 'text-text-muted hover:text-white'}`}>Series</button></li>
        <li><button on:click={() => dispatch('navigate', { page: 'kids' })} class={`text-sm font-medium transition-colors ${currentPage === 'kids' ? 'text-white' : 'text-text-muted hover:text-white'}`}>Kids</button></li>
      </ul>
    </div>
    
    <div class="flex items-center gap-3 sm:gap-6">
      <!-- Search Component -->
      <div class="relative flex items-center">
        <button class="text-white/80 hover:text-white transition-opacity z-10" aria-label="Search" on:click={() => isSearchOpen = !isSearchOpen}>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </button>
        
        <div class={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'w-32 sm:w-48 ml-2 opacity-100' : 'w-0 opacity-0'}`}>
          <input 
            type="text" 
            bind:value={searchQuery} 
            placeholder="Search movies..." 
            class="w-full bg-black/40 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white focus:outline-none focus:border-white/50 backdrop-blur-md"
          />
        </div>

        {#if isSearchOpen && (searchResults.length > 0 || isSearching || searchQuery.trim().length > 2)}
          <div class="absolute top-12 right-0 w-[80vw] sm:w-72 max-w-sm bg-bg-elevated border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[60vh]">
            {#if isSearching}
              <div class="p-4 text-center text-sm text-text-muted">Searching...</div>
            {:else if searchResults.length > 0}
              <div class="overflow-y-auto">
                {#each searchResults as movie}
                  <button class="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0" on:click={() => handleDetail(movie.id)}>
                    <img src={getImageUrl(movie.poster_path, 'w92')} alt={movie.title} class="w-10 h-14 object-cover rounded bg-black/50" />
                    <div class="flex-1 overflow-hidden">
                      <h4 class="text-white text-sm font-medium truncate">{movie.title || movie.name}</h4>
                      <p class="text-text-muted text-xs truncate">{movie.release_date?.substring(0, 4) || ''}</p>
                    </div>
                  </button>
                {/each}
              </div>
            {:else if searchQuery.trim().length > 2}
              <div class="p-4 text-center text-sm text-text-muted">No results found for "{searchQuery}"</div>
            {/if}
          </div>
        {/if}
      </div>

      <button class="text-white/80 hover:text-white transition-opacity" aria-label="Notifications">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </button>

      <div class="relative">
        <button 
          class="w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-transparent hover:border-white/50 transition-colors bg-white/10 flex items-center justify-center text-white/60"
          on:click={() => isProfileOpen = !isProfileOpen}
          aria-label="Profile Menu"
        >
          {#if $user && $user.photoURL}
            <img src={$user.photoURL} alt="Profile" class="w-full h-full object-cover" />
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          {/if}
        </button>

        {#if isProfileOpen}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- Invisible overlay to close dropdown when clicking outside -->
          <div class="fixed inset-0 z-40" on:click={() => isProfileOpen = false}></div>
          
          <div class="absolute right-0 mt-3 w-48 bg-bg-elevated border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-2">
            <div class="px-4 py-2 border-b border-white/5 mb-2">
              <p class="text-sm font-bold text-white">
                {#if $user}
                  {$user.displayName || $user.email || 'User'}
                {:else}
                  Guest User
                {/if}
              </p>
            </div>
            <ul class="flex flex-col">
              <li>
                <button 
                  class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                  on:click={handleWatchlistClick}
                >
                  My Watchlist
                </button>
              </li>
              <li>
                <button 
                  class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                  on:click={() => isProfileOpen = false}
                >
                  Settings
                </button>
              </li>
              <li>
                {#if $user}
                  <button 
                    class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    on:click={async () => { isProfileOpen = false; await logout(); dispatch('navigate', { page: 'home' }); }}
                  >
                    Sign Out
                  </button>
                {:else}
                  <button 
                    class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                    on:click={() => { isProfileOpen = false; dispatch('navigate', { page: 'login' }); }}
                  >
                    Sign In
                  </button>
                {/if}
              </li>
            </ul>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>
