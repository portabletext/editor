import {
  defineTextTransformRule,
  type InputRule,
} from '@portabletext/plugin-input-rule'

/**
 * @beta
 */
export const emDashRule = defineTextTransformRule({
  on: /--/,
  transform: () => '—',
})

/**
 * @beta
 */
export const ellipsisRule = defineTextTransformRule({
  on: /\.\.\./,
  transform: () => '…',
})

/**
 * @beta
 */
export const openingDoubleQuoteRule = defineTextTransformRule({
  on: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))"/g,
  transform: () => '“',
})

/**
 * @beta
 */
export const closingDoubleQuoteRule = defineTextTransformRule({
  on: /"/g,
  transform: () => '”',
})

/**
 * @beta
 */
export const openingSingleQuoteRule = defineTextTransformRule({
  on: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))'/g,
  transform: () => '‘',
})

/**
 * @beta
 */
export const closingSingleQuoteRule = defineTextTransformRule({
  on: /'/g,
  transform: () => '’',
})

/**
 * @beta
 */
export const smartQuotesRules: Array<InputRule> = [
  openingDoubleQuoteRule,
  closingDoubleQuoteRule,
  openingSingleQuoteRule,
  closingSingleQuoteRule,
]

/**
 * @beta
 */
export const leftArrowRule = defineTextTransformRule({
  on: /<-/,
  transform: () => '←',
})

/**
 * @beta
 */
export const rightArrowRule = defineTextTransformRule({
  on: /->/,
  transform: () => '→',
})

/**
 * @beta
 */
export const copyrightRule = defineTextTransformRule({
  on: /\(c\)/,
  transform: () => '©',
})

/**
 * @beta
 */
export const servicemarkRule = defineTextTransformRule({
  on: /\(sm\)/,
  transform: () => '℠',
})

/**
 * @beta
 */
export const trademarkRule = defineTextTransformRule({
  on: /\(tm\)/,
  transform: () => '™',
})

/**
 * @beta
 */
export const registeredTrademarkRule = defineTextTransformRule({
  on: /\(r\)/,
  transform: () => '®',
})

/**
 * @beta
 */
export const oneHalfRule = defineTextTransformRule({
  on: /(?:^|\s)(1\/2)\s/,
  transform: () => '½',
})

/**
 * @beta
 */
export const plusMinusRule = defineTextTransformRule({
  on: /\+\/-/,
  transform: () => '±',
})

/**
 * @beta
 */
export const notEqualRule = defineTextTransformRule({
  on: /!=/,
  transform: () => '≠',
})

/**
 * @beta
 */
export const laquoRule = defineTextTransformRule({
  on: /<</,
  transform: () => '«',
})

/**
 * @beta
 */
export const raquoRule = defineTextTransformRule({
  on: />>/,
  transform: () => '»',
})

/**
 * @beta
 */
export const multiplicationRule = defineTextTransformRule({
  on: /\d+\s?([*x])\s?\d+/,
  transform: () => '×',
})

/**
 * @beta
 */
export const superscriptTwoRule = defineTextTransformRule({
  on: /\^2/,
  transform: () => '²',
})

/**
 * @beta
 */
export const superscriptThreeRule = defineTextTransformRule({
  on: /\^3/,
  transform: () => '³',
})

/**
 * @beta
 */
export const oneQuarterRule = defineTextTransformRule({
  on: /(?:^|\s)(1\/4)\s/,
  transform: () => '¼',
})

/**
 * @beta
 */
export const threeQuartersRule = defineTextTransformRule({
  on: /(?:^|\s)(3\/4)\s/,
  transform: () => '¾',
})
