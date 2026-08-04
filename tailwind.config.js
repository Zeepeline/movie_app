/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#141414',
        'bg-surface': '#222222',
        'bg-elevated': '#333333',
        'text-muted': '#b3b3b3',
        'brand-red': '#e50914',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
