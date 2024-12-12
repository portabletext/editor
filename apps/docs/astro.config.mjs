import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import {defineConfig} from 'astro/config'
import starlightTypeDoc, {typeDocSidebarGroup} from 'starlight-typedoc'

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    starlight({
      title: 'Portable Text Editor Docs',
      social: {
        github: 'https://github.com/portabletext/editor',
      },
      sidebar: [
        {slug: 'getting-started'},
        {
          label: 'Guides',
          autogenerate: {directory: 'guides'},
        },
        {
          label: 'Concepts',
          autogenerate: {directory: 'concepts'},
        },
        {
          label: 'Reference',
          autogenerate: {directory: 'reference'},
        },
        typeDocSidebarGroup,
        {
          label: 'Integrations',
          autogenerate: {directory: 'integrations'},
        },
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: [
            '../../packages/editor/src/types/editor.ts',
            '../../packages/editor/src/index.ts',
          ],
          tsconfig: '../../packages/editor/tsconfig.json',
        }),
      ],
    }),
  ],
})
