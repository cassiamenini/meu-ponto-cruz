import { defineConfig, type Plugin } from 'vite';

/**
 * Na versão publicada, tira da regra de proteção (CSP) a permissão de conexão
 * com "ws://localhost", que só serve para atualizar a página durante o desenvolvimento.
 */
function cspDePublicacao(): Plugin {
  return {
    name: 'csp-de-publicacao',
    apply: 'build',
    transformIndexHtml: (html) => html.replace(" connect-src 'self' ws://localhost:*;", " connect-src 'self';"),
  };
}

export default defineConfig({
  // Caminhos relativos: o site funciona em qualquer endereço
  // (GitHub Pages, Cloudflare Pages ou uma subpasta).
  base: './',
  plugins: [cspDePublicacao()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
