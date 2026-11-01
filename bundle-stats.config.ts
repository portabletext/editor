import {defineConfig} from '@rexxars/bundle-stats/config'

export default defineConfig({
  conditions: ['browser', 'module', 'import', 'default'],
  packages: [
    'packages/block-tools',
    {
      root: 'packages/editor',
      scenarios: {
        entries: {
          defineSchema: './bundle-tests/define-schema.ts',
          useEditor: './bundle-tests/use-editor.ts',
          typical: './bundle-tests/typical.ts',
        },
      },
    },
    {
      root: 'packages/html',
      scenarios: {
        entries: {
          htmlToPortableText: './bundle-tests/html-to-portable-text.ts',
        },
      },
    },
    'packages/keyboard-shortcuts',
    {
      root: 'packages/markdown',
      scenarios: {
        entries: {
          portableTextToMarkdown: './bundle-tests/portable-text-to-markdown.ts',
        },
      },
    },
    'packages/patches',
    'packages/repair',
    'packages/sanity-bridge',
    'packages/schema',
    ...[
      'packages/plugin-character-pair-decorator',
      'packages/plugin-decorations',
      'packages/plugin-dnd',
      'packages/plugin-emoji-picker',
      'packages/plugin-input-rule',
      'packages/plugin-list-index',
      'packages/plugin-markdown-shortcuts',
      'packages/plugin-one-line',
      'packages/plugin-paste-link',
      'packages/plugin-sdk-value',
      'packages/plugin-typeahead-picker',
      'packages/plugin-typography',
    ].map((root) => ({root, importTime: false})),
    {
      root: 'packages/toolbar',
      scenarios: {entries: {typical: './bundle-tests/typical.ts'}},
      importTime: false,
    },
    {
      root: 'packages/plugin-table',
      scenarios: {exports: {exclude: ['ui/styles.css']}},
      importTime: false,
    },
  ],
})
