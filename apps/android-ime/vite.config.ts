import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// `split.html` builds in a pass of its own, `--mode split`: a third entry in this build would move a chunk
// shared between entries out of `editor.html`'s script and change the editor pages' build.
export default defineConfig(({mode}) => ({
  root: 'page',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: mode !== 'split',
    rolldownOptions: {
      input: (mode === 'split'
        ? {split: 'page/split.html'}
        : {editor: 'page/editor.html', plain: 'page/plain.html'}) as Record<
        string,
        string
      >,
    },
  },
}))
