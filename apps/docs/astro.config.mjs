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
const [blockToolsTypeDoc, blockToolsTypeDocSidebar] =
  createStarlightTypeDocPlugin()
const tsconfig = '../../packages/editor/tsconfig.typedoc.json'

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
      social: [
        {
          href: 'https://github.com/portabletext/editor',
          icon: 'github',
          label: 'GitHub',
        },
      ],
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
          collapsed: true,
          items: [
            {
              label: 'Editor',
              items: [
                {label: 'Overview', slug: 'reference/editor'},
                {...editorTypeDocSidebar, badge: 'Generated'},
              ],
            },
            {
              label: 'Behaviors',
              items: [
                {label: 'Overview', slug: 'reference/behavior-api'},
                {...behaviorTypeDocSidebar, badge: 'Generated'},
              ],
            },
            {
              label: 'Plugins',
              items: [
                {label: 'Overview', slug: 'reference/plugins'},
                {...pluginsTypeDocSidebar, badge: 'Generated'},
              ],
            },
            {
              label: 'Selectors',
              items: [
                {label: 'Overview', slug: 'reference/selectors'},
                {...selectorsTypeDocSidebar, badge: 'Generated'},
              ],
            },
            {
              label: 'Toolbar',
              items: [
                {label: 'Overview', slug: 'reference/toolbar'},
                {...toolbarTypeDocSidebar, badge: 'Generated'},
              ],
            },
            {
              label: 'Keyboard Shortcuts',
              items: [
                {label: 'Overview', slug: 'reference/keyboard-shortcuts'},
                {...keyboardShortcutsTypeDocSidebar, badge: 'Generated'},
              ],
            },
            {
              label: 'Block Tools',
              items: [
                {label: 'Overview', slug: 'reference/block-tools'},
                {...blockToolsTypeDocSidebar, badge: 'Generated'},
              ],
            },
          ],
        },
        {
          label: 'Integrations',
          autogenerate: {directory: 'integrations'},
        },
        {
          label: 'Resources',
          autogenerate: {directory: 'resources'},
        },
        {
          label: 'Portable Text Specification',
          link: 'https://github.com/portabletext/portabletext',
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
        blockToolsTypeDoc({
          entryPoints: ['../../packages/block-tools/src/index.ts'],
          output: 'api/block-tools',
          typeDoc: {
            excludeReferences: true,
            skipErrorChecking: true,
          },
          sidebar: {
            collapsed: true,
          },
          tsconfig: '../../packages/block-tools/tsconfig.json',
        }),
        ...(process.env.CHECK_LINKS ? [starlightLinksValidator()] : []),
      ],
    }),
  ],
  vite: {plugins: [tailwindcss()]},
})
