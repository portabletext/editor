import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import {defineConfig} from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'
import {createStarlightTypeDocPlugin} from 'starlight-typedoc'

const [editorTypeDoc, editorTypeDocSidebar] = createStarlightTypeDocPlugin()
const [behaviorTypeDoc, behaviorTypeDocSidebar] = createStarlightTypeDocPlugin()
const [pluginsTypeDoc, pluginsTypeDocSidebar] = createStarlightTypeDocPlugin()
const [selectorsTypeDoc, selectorsTypeDocSidebar] =
  createStarlightTypeDocPlugin()
const [toolbarTypeDoc, toolbarTypeDocSidebar] = createStarlightTypeDocPlugin()
const [keyboardShortcutsTypeDoc, keyboardShortcutsTypeDocSidebar] =
  createStarlightTypeDocPlugin()
const tsconfig = '../../packages/editor/tsconfig.typedoc.json'

// https://astro.build/config
export default defineConfig({
  site: 'https://www.portabletext.org',
  redirects: {
    '/integrations/serializers/': '/rendering/',
    '/concepts/': '/editor/concepts/',
    '/concepts/portabletext/': '/editor/concepts/portabletext/',
    '/concepts/behavior/': '/editor/concepts/behavior/',
    '/guides/': '/editor/guides/',
    '/guides/custom-rendering/': '/editor/guides/custom-rendering/',
    '/guides/customize-toolbar/': '/editor/guides/customize-toolbar/',
    '/guides/create-behavior/': '/editor/guides/create-behavior/',
    '/guides/behavior-cheat-sheet/': '/editor/guides/behavior-cheat-sheet/',
    '/reference/': '/editor/reference/',
    '/reference/editor/': '/editor/reference/editor/',
    '/reference/behavior-api/': '/editor/reference/behavior-api/',
    '/reference/plugins/': '/editor/reference/plugins/',
    '/reference/selectors/': '/editor/reference/selectors/',
    '/reference/toolbar/': '/editor/reference/toolbar/',
    '/reference/keyboard-shortcuts/': '/editor/reference/keyboard-shortcuts/',
    '/getting-started/': '/introduction/',
  },
  integrations: [
    react(),
    starlight({
      title: 'Portable Text',
      components: {
        PageTitle: './src/components/overrides/page-title.astro',
      },
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
      social: [
        {
          href: 'https://github.com/portabletext/editor',
          icon: 'github',
          label: 'GitHub',
        },
      ],
      sidebar: [
        {slug: 'introduction'},
        {
          label: 'Rendering',
          items: [
            {slug: 'rendering', label: 'Overview'},
            {slug: 'rendering/react'},
            {slug: 'rendering/html'},
            {slug: 'rendering/vue'},
            {slug: 'rendering/svelte'},
            {slug: 'rendering/astro'},
            {slug: 'rendering/markdown'},
          ],
        },
        {
          label: 'Editor',
          items: [
            {slug: 'editor/getting-started'},
            {slug: 'editor/concepts/portabletext'},
            {slug: 'editor/concepts/behavior'},
            {slug: 'editor/guides/custom-rendering'},
            {slug: 'editor/guides/customize-toolbar'},
            {slug: 'editor/guides/create-behavior'},
            {slug: 'editor/guides/behavior-cheat-sheet'},
            {
              label: 'Reference',
              collapsed: true,
              items: [
                {
                  label: 'Editor',
                  items: [
                    {label: 'Overview', slug: 'editor/reference/editor'},
                    {...editorTypeDocSidebar, badge: 'Generated'},
                  ],
                },
                {
                  label: 'Behaviors',
                  items: [
                    {label: 'Overview', slug: 'editor/reference/behavior-api'},
                    {...behaviorTypeDocSidebar, badge: 'Generated'},
                  ],
                },
                {
                  label: 'Plugins',
                  items: [
                    {label: 'Overview', slug: 'editor/reference/plugins'},
                    {...pluginsTypeDocSidebar, badge: 'Generated'},
                  ],
                },
                {
                  label: 'Selectors',
                  items: [
                    {label: 'Overview', slug: 'editor/reference/selectors'},
                    {...selectorsTypeDocSidebar, badge: 'Generated'},
                  ],
                },
                {
                  label: 'Toolbar',
                  items: [
                    {label: 'Overview', slug: 'editor/reference/toolbar'},
                    {...toolbarTypeDocSidebar, badge: 'Generated'},
                  ],
                },
                {
                  label: 'Keyboard Shortcuts',
                  items: [
                    {
                      label: 'Overview',
                      slug: 'editor/reference/keyboard-shortcuts',
                    },
                    {...keyboardShortcutsTypeDocSidebar, badge: 'Generated'},
                  ],
                },
              ],
            },
          ],
        },
        {slug: 'why-portable-text'},
        {slug: 'specification'},
        {
          label: 'Resources',
          autogenerate: {directory: 'resources'},
        },
        {
          label: 'Playground',
          link: 'https://playground.portabletext.org/',
        },
      ],
      plugins: [
        editorTypeDoc({
          entryPoints: ['../../packages/editor/src/index.ts'],
          output: 'api/editor',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig,
        }),
        behaviorTypeDoc({
          entryPoints: ['../../packages/editor/src/behaviors/index.ts'],
          output: 'api/behaviors',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig,
        }),
        pluginsTypeDoc({
          entryPoints: ['../../packages/editor/src/plugins/index.ts'],
          output: 'api/plugins',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig,
        }),
        selectorsTypeDoc({
          entryPoints: ['../../packages/editor/src/selectors/index.ts'],
          output: 'api/selectors',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig,
        }),
        toolbarTypeDoc({
          entryPoints: ['../../packages/toolbar/src/index.ts'],
          output: 'api/toolbar',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig: '../../packages/toolbar/tsconfig.json',
        }),
        keyboardShortcutsTypeDoc({
          entryPoints: ['../../packages/keyboard-shortcuts/src/index.ts'],
          output: 'api/keyboard-shortcuts',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig: '../../packages/keyboard-shortcuts/tsconfig.json',
        }),
        ...(process.env.CHECK_LINKS ? [starlightLinksValidator()] : []),
      ],
    }),
  ],
  vite: {plugins: [tailwindcss()]},
})
