// vite.config.js
import { defineConfig } from 'vite';
import svelte from '@sveltejs/vite-plugin-svelte';
import multiEntry from '@rollup/plugin-multi-entry';

export default defineConfig({
  plugins: [
    svelte(),
    multiEntry(),
  ],
});
