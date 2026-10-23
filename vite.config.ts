import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativo: o build funciona em qualquer subcaminho (GitHub Pages, Vercel etc.)
export default defineConfig({
  base: './',
  plugins: [react()],
})
