import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

const devMode = process.env.NODE_ENV === 'development';
const watcherOpts = devMode ? {} : undefined;

export default defineConfig({
  plugins: [preact()],
  build: {
    emptyOutDir: false,
    sourcemap: devMode,
    outDir: 'dist-firefox',
    watch: watcherOpts,
    rollupOptions: {
      input: {
        popup: new URL('./src/popup.html', import.meta.url).pathname
      }
    },
  }
})