<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  import { loginWithGoogle } from '../store/auth';
  
  const dispatch = createEventDispatcher();
  
  let email = '';
  let password = '';
  let isSubmitting = false;

  function handleSubmit() {
    isSubmitting = true;
    // Simulate network delay for email login
    setTimeout(() => {
      isSubmitting = false;
      dispatch('loginSuccess');
    }, 1200);
  }

  async function handleGoogleLogin() {
    isSubmitting = true;
    try {
      await loginWithGoogle();
      dispatch('loginSuccess');
    } catch (error) {
      console.error(error);
      alert("Gagal login dengan Google. Silakan coba lagi.");
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
</script>

<div class="relative w-full h-screen min-h-150 flex items-center justify-center overflow-hidden bg-black">
  <!-- Cinematic Background -->
  <div class="absolute inset-0 z-0">
    <img 
      src="https://image.tmdb.org/t/p/original/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg" 
      alt="Cinematic Background" 
      class="w-full h-full object-cover opacity-50"
    />
    <div class="absolute inset-0 bg-linear-to-b from-black/80 via-black/40 to-black"></div>
    <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
  </div>

  <!-- Header Logo (Absolute Top) -->
  <div class="absolute top-0 left-0 w-full p-6 lg:px-[4%] z-20">
    <a href="/" class="text-3xl font-black tracking-tighter text-brand-red flex items-center gap-1" on:click|preventDefault={() => dispatch('navigateHome')}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-8 h-8">
        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
      </svg>
      MOOV
    </a>
  </div>

  <!-- Login Card -->
  <div class="relative z-10 w-full max-w-md px-6 animate-fly-up">
    <div class="bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl">
      <h1 class="text-3xl font-bold text-white mb-8">Sign In</h1>

      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input 
            id="email" 
            type="email" 
            bind:value={email}
            required
            placeholder="Email address" 
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label for="password" class="sr-only">Password</label>
          <input 
            id="password" 
            type="password" 
            bind:value={password}
            required
            placeholder="Password" 
            class="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3.5 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          class="w-full bg-brand-red hover:bg-brand-red/90 text-white font-bold py-3.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(229,9,20,0.3)] disabled:opacity-70"
        >
          {#if isSubmitting}
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing In...
          {:else}
            Sign In
          {/if}
        </button>
      </form>

      <div class="mt-6 flex items-center justify-between">
        <span class="border-b border-white/20 w-1/5 lg:w-1/4"></span>
        <span class="text-xs text-center text-white/50 uppercase font-medium">Or continue with</span>
        <span class="border-b border-white/20 w-1/5 lg:w-1/4"></span>
      </div>

      <button 
        type="button" 
        on:click={handleGoogleLogin}
        disabled={isSubmitting}
        class="mt-6 w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
          <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
          <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
          <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
        </svg>
        Sign in with Google
      </button>

      <p class="mt-8 text-center text-sm text-white/50">
        New to Moov? 
        <button class="text-white hover:underline font-medium ml-1">Sign up now.</button>
      </p>
    </div>
  </div>
</div>
