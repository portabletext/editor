import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import {defineConfig} from 'astro/config'

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
      ],
    }),
  ],
})
