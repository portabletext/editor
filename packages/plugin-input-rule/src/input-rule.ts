/**
 * @beta
 */
export type InputRule = {
  matcher: RegExp
  transform: () => string
}

/**
 * @beta
 */
export function defineInputRule(config: {
  matcher: RegExp
  transform: () => string
}): InputRule {
  return {
    matcher: config.matcher,
    transform: config.transform,
  }
}
