import path from 'node:path'
import babel from '@rolldown/plugin-babel'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({presets: [reactCompilerPreset({target: '19'})]})],
  resolve: {
    alias: {
      '@portabletext/editor': path.resolve(
        __dirname,
        '../../packages/editor/src',
      ),
      '@portabletext/block-tools': path.resolve(
        __dirname,
        '../../packages/block-tools/src',
      ),
      '@portabletext/patches': path.resolve(
        __dirname,
        '../../packages/patches/src',
      ),
    },
  },
})
