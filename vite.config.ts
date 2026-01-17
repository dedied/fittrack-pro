
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use a relative base to allow deployment on subpaths (GitHub Pages) 
  // and preview environments without origin mismatch errors or broken asset links.
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: '', // Flatten assets to root to avoid relative path issues in PWA
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
