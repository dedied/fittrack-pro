import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use the repository name as the base path for GitHub Pages deployment.
  // This ensures all asset links are correct.
  base: '/fittrack-pro/', 
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