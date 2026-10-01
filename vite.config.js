import { readFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The public address of the site (used for link previews). Change "homepage" in package.json
// when you move to your own domain, e.g. "https://school.example.com/".
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const SITE_URL = (pkg.homepage || '/').replace(/\/?$/, '/');

// `npm run build`      → regular multi-file build (needs a server that sends every path to index.html).
// `npm run build:single` → one self-contained HTML file with hash routing.
// `npm run build:docs`  → the single-file build copied into docs/ for GitHub Pages.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  const base = single ? './' : '/';
  return {
    base,
    plugins: [
      react(),
      {
        name: 'edufy-html-vars',
        transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL).replaceAll('%BASE%', base) },
      },
      ...(single ? [viteSingleFile()] : []),
    ],
    define: {
      __HASH_ROUTER__: JSON.stringify(single),
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 1500,
    },
  };
});
