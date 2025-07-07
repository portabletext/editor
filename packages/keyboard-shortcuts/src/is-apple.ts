export const IS_APPLE =
  typeof window !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent)
