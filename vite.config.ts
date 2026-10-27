import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos: o site funciona em qualquer endereço
  // (GitHub Pages, Cloudflare Pages ou uma subpasta).
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
});
