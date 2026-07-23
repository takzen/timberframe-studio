import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://takzen.github.io/timberframe-studio/ on GitHub Pages;
// base is only needed for the production build, dev stays at root.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/timberframe-studio/' : '/',
  plugins: [react()],
}))
