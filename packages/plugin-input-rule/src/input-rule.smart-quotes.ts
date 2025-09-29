import type {InputRule} from './input-rule'

/**
 * @beta
 */
export const openingDoubleQuoteRule: InputRule = {
  matcher: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))"/g,
  transform: () => '“',
}

/**
 * @beta
 */
export const closingDoubleQuoteRule: InputRule = {
  matcher: /"/g,
  transform: () => '”',
}

/**
 * @beta
 */
export const openingSingleQuoteRule: InputRule = {
  matcher: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))'/g,
  transform: () => '‘',
}

/**
 * @beta
 */
export const closingSingleQuoteRule: InputRule = {
  matcher: /'/g,
  transform: () => '’',
}

/**
 * @beta
 */
export const smartQuotesRules: InputRule[] = [
  openingDoubleQuoteRule,
  closingDoubleQuoteRule,
  openingSingleQuoteRule,
  closingSingleQuoteRule,
]
