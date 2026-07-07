import stylesheet from './styles.css?raw'

/**
 * The reference UI's stylesheet as text, for hosts whose build has no CSS
 * pipeline and cannot import `@portabletext/plugin-table/ui/styles.css`.
 * Inject it through whatever styling system the host already has, for
 * example a styled-components `createGlobalStyle`. Hosts with a bundler
 * should import the stylesheet file instead.
 *
 * @public
 */
export const stylesText: string = stylesheet
