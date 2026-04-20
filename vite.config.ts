import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue(), cssInjectedByJs()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'VuePrince',
      fileName: (format) => `vue-prince.${format}.js`,
    },
    rollupOptions: {
      external: ['vue', 'pinia', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'vue-router': 'VueRouter',
        },
      },
    },
  },
})
