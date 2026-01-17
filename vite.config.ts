
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for GitHub Pages subdirectories
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
