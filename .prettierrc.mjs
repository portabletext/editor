import config from '@sanity/prettier-config'

export default {
  ...config,
  printWidth: 80,
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-gherkin'],
}
