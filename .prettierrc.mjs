import config from '@sanity/prettier-config'

// Prettier only formats what oxfmt cannot: Astro components and Gherkin
// feature specs. Everything else (TS/JS/JSX, JSON, YAML, Markdown) is
// formatted by oxfmt (see .oxfmtrc.json).
export default {
  ...config,
  printWidth: 80,
  plugins: [
    ...config.plugins,
    'prettier-plugin-astro',
    'prettier-plugin-gherkin',
  ],
}
