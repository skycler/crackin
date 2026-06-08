import { defineConfig } from 'vite'

export default defineConfig({
  base: '/crackin/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
})
