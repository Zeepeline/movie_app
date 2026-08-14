<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import { getImageUrl, searchMovies } from '../lib/tmdb';
  import { logout, user } from '../store/auth';

  export let currentPage: string = 'home';

  const dispatch = createEventDispatcher();
  let isScrolled = false;
  let isSearchOpen = false;
  let isProfileOpen = false;
  let isMobileMenuOpen = false;
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
    isMobileMenuOpen = false;
    searchQuery = '';
  }

  function handleNavigateMobile(page: string) {
    dispatch('navigate', { page });
    isMobileMenuOpen = false;
  }

  function handleWatchlistClick() {
    dispatch('openWatchlist');
    isProfileOpen = false;
    isMobileMenuOpen = false;
  }
</script>

<nav class={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'py-3.5 bg-black/90 backdrop-blur-2xl border-b border-white/10 shadow-2xl' : 'py-4 sm:py-6 bg-linear-to-b from-black/90 via-black/50 to-transparent'}`}>
  <div class="w-full max-w-[1600px] mx-auto px-[4%]">
    <!-- Top Row -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4 lg:gap-12">
        <button 
          class="flex items-center mr-0 sm:mr-4 cursor-pointer focus:outline-none"
          on:click={() => { isMobileMenuOpen = false; dispatch('navigate', { page: 'home' }); }}
          aria-label="Moov Home"
        >
          <svg viewBox="0 0 100 30" class="w-18 sm:w-22 h-5 sm:h-6">
            <path d="M0,30 L10,0 L25,0 L35,20 L45,0 L60,0 L70,30 L55,30 L48,15 L42,30 L30,30 L23,15 L15,30 Z" fill="white"/>
            <circle cx="85" cy="15" r="12" fill="none" stroke="white" stroke-width="4"/>
            <circle cx="115" cy="15" r="12" fill="none" stroke="white" stroke-width="4"/>
          </svg>
        </button>
        
        <!-- Desktop Navigation Links -->
        <ul class="hidden md:flex list-none gap-8">
          <li><button on:click={() => dispatch('navigate', { page: 'home' })} class={`text-sm font-medium transition-colors cursor-pointer ${currentPage === 'home' ? 'text-white font-bold' : 'text-text-muted hover:text-white'}`}>Home</button></li>
          <li><button on:click={() => dispatch('navigate', { page: 'movies' })} class={`text-sm font-medium transition-colors cursor-pointer ${currentPage === 'movies' ? 'text-white font-bold' : 'text-text-muted hover:text-white'}`}>Movies</button></li>
          <li><button on:click={() => dispatch('navigate', { page: 'series' })} class={`text-sm font-medium transition-colors cursor-pointer ${currentPage === 'series' ? 'text-white font-bold' : 'text-text-muted hover:text-white'}`}>Series</button></li>
          <li><button on:click={() => dispatch('navigate', { page: 'kids' })} class={`text-sm font-medium transition-colors cursor-pointer ${currentPage === 'kids' ? 'text-white font-bold' : 'text-text-muted hover:text-white'}`}>Kids</button></li>
        </ul>
      </div>
      
      <div class="flex items-center gap-2.5 sm:gap-6">
        <!-- Search Component -->
        <div class="relative flex items-center">
          <button class="text-white/80 hover:text-white transition-opacity z-10 cursor-pointer p-1.5" aria-label="Search" on:click={() => isSearchOpen = !isSearchOpen}>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>
          
          <div class={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'w-36 sm:w-48 ml-2 opacity-100' : 'w-0 opacity-0'}`}>
            <input 
              type="text" 
              bind:value={searchQuery} 
              placeholder="Search movies..." 
              class="w-full bg-black/40 border border-white/20 rounded-full px-4 py-1.5 text-sm text-white focus:outline-none focus:border-white/50 backdrop-blur-md"
            />
          </div>

          {#if isSearchOpen && (searchResults.length > 0 || isSearching || searchQuery.trim().length > 2)}
            <div class="absolute top-12 right-0 w-[85vw] sm:w-72 max-w-sm bg-bg-elevated border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-[60vh]">
              {#if isSearching}
                <div class="p-4 text-center text-sm text-text-muted">Searching...</div>
              {:else if searchResults.length > 0}
                <div class="overflow-y-auto">
                  {#each searchResults as movie}
                    <button class="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0 cursor-pointer" on:click={() => handleDetail(movie.id)}>
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

        <!-- Profile Avatar Menu -->
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
                    class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    on:click={handleWatchlistClick}
                  >
                    My Watchlist
                  </button>
                </li>
                <li>
                  {#if $user}
                    <button 
                      class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      on:click={async () => { isProfileOpen = false; await logout(); dispatch('navigate', { page: 'home' }); }}
                    >
                      Sign Out
                    </button>
                  {:else}
                    <button 
                      class="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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

        <!-- Mobile Hamburger Toggle Button -->
        <button 
          class="md:hidden p-2 rounded-xl text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer focus:outline-none"
          on:click={() => isMobileMenuOpen = !isMobileMenuOpen}
          aria-label="Toggle Navigation Menu"
        >
          {#if isMobileMenuOpen}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          {/if}
        </button>
      </div>
    </div>

    <!-- Mobile Dropdown Navigation Menu -->
    {#if isMobileMenuOpen}
      <div 
        transition:slide={{ duration: 250 }}
        class="md:hidden mt-3 pt-3 pb-2 border-t border-white/10 flex flex-col gap-1.5 bg-black/60 backdrop-blur-xl rounded-2xl p-2"
      >
        <button 
          on:click={() => handleNavigateMobile('home')}
          class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${currentPage === 'home' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Home</span>
        </button>

        <button 
          on:click={() => handleNavigateMobile('movies')}
          class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${currentPage === 'movies' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
          <span>Movies</span>
        </button>

        <button 
          on:click={() => handleNavigateMobile('series')}
          class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${currentPage === 'series' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
          <span>TV Series</span>
        </button>

        <button 
          on:click={() => handleNavigateMobile('kids')}
          class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${currentPage === 'kids' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span>Kids & Family</span>
        </button>

        <button 
          on:click={handleWatchlistClick}
          class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${currentPage === 'watchlist' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30 font-bold' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <span>My Watchlist</span>
        </button>
      </div>
    {/if}
  </div>
</nav>
