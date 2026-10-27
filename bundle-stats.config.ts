import {defineConfig} from '@rexxars/bundle-stats/config'

export default defineConfig({
  conditions: ['browser', 'module', 'import', 'default'],
  packages: [
    'packages/block-tools',
    'packages/editor',
    'packages/html',
    'packages/keyboard-shortcuts',
    'packages/markdown',
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
      'packages/toolbar',
    ].map((root) => ({root, importTime: false})),
    {
      root: 'packages/plugin-table',
      scenarios: {exports: {exclude: ['ui/styles.css']}},
      importTime: false,
    },
  ],
})
