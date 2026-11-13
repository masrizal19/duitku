import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { fileURLToPath } from 'url';

function githubPagesSpaFallbackPlugin(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      const distDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
      const indexFile = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexFile)) return;

      const html = fs.readFileSync(indexFile, 'utf-8');
      // 404.html fallback untuk SPA routes di GitHub Pages
      fs.writeFileSync(path.join(distDir, '404.html'), html);
      // Route eksplisit /reset-password agar mengembalikan HTTP 200 OK saat diakses langsung
      const resetDir = path.join(distDir, 'reset-password');
      fs.mkdirSync(resetDir, { recursive: true });
      fs.writeFileSync(path.join(resetDir, 'index.html'), html);
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss(), githubPagesSpaFallbackPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
