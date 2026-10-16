import { fileURLToPath, URL } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { fakeBackend } from './server/plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    fakeBackend(),
  ],
  resolve: {
    alias: {
      'component-lib': fileURLToPath(new URL('./src/component-lib', import.meta.url)),
    },
  },
})
