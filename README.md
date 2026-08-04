# Moov - Movie & TV Series App 🎬

Moov adalah aplikasi *streaming/discovery* Film dan Serial TV bergaya sinematik (terinspirasi dari antarmuka Netflix). Dibangun menggunakan **Svelte**, **Vite**, **Tailwind CSS**, dan **TMDB API**, aplikasi ini menawarkan pengalaman navigasi yang mulus, cepat, dan modern.

## ✨ Fitur Utama
- **Cinematic UI/UX:** Desain antarmuka premium dengan elemen *glassmorphism*, efek *hover*, dan navigasi imersif.
- **Movies & TV Series:** Telusuri ragam Film dan Serial TV populer.
- **Episodes Grid:** Tampilan daftar episode interaktif untuk TV Series.
- **Video Player terintegrasi:** Tonton langsung film atau serial (*powered by* Vidking) melalui *Player Modal* terpadu.
- **Watchlist:** Fitur "My List" untuk menyimpan film favorit di penyimpanan lokal (*local storage*).
- **Pencarian Instan:** *Live search* super responsif.
- **Halaman Login:** Simulasi otentikasi bergaya layar penuh dengan dukungan simulasi "Sign in with Google".

## 🚀 Instalasi & Menjalankan di Lokal

1. **Kloning Repositori:**
   ```bash
   git clone https://github.com/Zeepeline/movie_app.git
   cd movie_app
   ```
2. **Instal Dependensi:**
   ```bash
   npm install
   ```
3. **Jalankan Server Pengembangan (Dev Server):**
   ```bash
   npm run dev
   ```
4. Buka browser dan arahkan ke `http://localhost:5173`.

## 🌐 Cara Deploy ke GitHub Pages (Otomatis dengan GitHub Actions)

Anda bisa meng-*online*-kan web ini secara gratis di GitHub Pages. Agar setiap kali Anda melakukan `git push`, webnya otomatis ter-*update*, kita bisa menggunakan fitur **GitHub Actions**.

### 1. Ubah Pengaturan Vite (`vite.config.ts`)
Buka file `vite.config.ts` dan tambahkan `base`. Ganti `movie_app` dengan nama repositori Anda:
```typescript
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: '/movie_app/' // Hapus ini jika menggunakan domain kustom (misal: irmintul.online)
})
```

### 2. Aktifkan Izin Workflow di GitHub
1. Masuk ke halaman repo GitHub Anda.
2. Buka menu **Settings** > **Actions** > **General**.
3. Gulir ke bawah ke bagian **Workflow permissions**, pastikan Anda mencentang **Read and write permissions**, lalu klik **Save**.

### 3. Buat File Konfigurasi GitHub Actions
1. Di dalam proyek lokal Anda, buat folder `.github/workflows/`.
2. Buat file bernama `deploy.yml` di dalam folder tersebut dan isi dengan kode berikut:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 4. Push ke GitHub
Simpan semuanya, lalu eksekusi di terminal:
```bash
git add .
git commit -m "Setup GitHub Actions for deployment"
git push origin main
```
Tunggu beberapa menit, GitHub akan membangun aplikasi Anda secara otomatis. Anda dapat melihat hasilnya di `https://Zeepeline.github.io/movie_app/`.

### 5. (Opsional) Menggunakan Domain Pribadi (Misal: `irmintul.online`)
Jika Anda menggunakan *custom domain*:
1. Hapus opsi `base: '/movie_app/'` di `vite.config.ts`.
2. Di repositori GitHub, masuk ke **Settings** > **Pages**.
3. Pada opsi **Custom domain**, masukkan `irmintul.online` dan simpan.
4. Di penyedia domain Anda (seperti Niagahoster/Hostinger), buat 4 **A Record** ke:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
5. *(Tunggu masa propagasi DNS maksimal 1x24 jam, web Anda sudah bisa diakses lewat domain pribadi!)*
