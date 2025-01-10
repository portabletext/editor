import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwind from '@astrojs/tailwind'
import {defineConfig} from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'
import starlightTypeDoc, {typeDocSidebarGroup} from 'starlight-typedoc'

// https://astro.build/config
export default defineConfig({
  site: 'https://www.portabletext.org',
  integrations: [
    react(),
    starlight({
      title: 'Portable Text Editor',
      customCss: ['./src/styles/globals.css'],
      editLink: {
        baseUrl: 'https://github.com/portabletext/editor/tree/main/apps/docs/',
      },
      head: [
        import.meta.env.PROD && {
          tag: 'script',
          attrs: {
            'src': 'https://cdn.usefathom.com/script.js',
            'data-site': 'DEFNRQRQ',
            'defer': true,
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content:
              'https://cdn.sanity.io/images/3do82whm/next/af75536d90557ab2644502be89cd6635ce7afbe8-2560x1600.png?w=1200&h=630&q=80&dpi=2&fit=crop',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
        {tag: 'meta', attrs: {name: 'og:image:width', content: '1200'}},
        {tag: 'meta', attrs: {name: 'og:image:height', content: '630'}},
      ].filter(Boolean),
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
        {
          label: 'Portable Text Specification',
          link: 'https://github.com/portabletext/portabletext',
        },
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ['../../packages/editor/src/index.ts'],
          tsconfig: '../../packages/editor/tsconfig.json',
        }),
        ...(process.env.CHECK_LINKS ? [starlightLinksValidator()] : []),
      ],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
})
