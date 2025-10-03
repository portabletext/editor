import {
  defineTextTransformRule,
  type InputRule,
} from '@portabletext/plugin-input-rule'

/**
 * @public
 */
export const emDashRule = defineTextTransformRule({
  on: /--/,
  transform: () => '—',
})

/**
 * @public
 */
export const ellipsisRule = defineTextTransformRule({
  on: /\.\.\./,
  transform: () => '…',
})

/**
 * @public
 */
export const openingDoubleQuoteRule = defineTextTransformRule({
  on: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))"/g,
  transform: () => '“',
})

/**
 * @public
 */
export const closingDoubleQuoteRule = defineTextTransformRule({
  on: /"/g,
  transform: () => '”',
})

/**
 * @public
 */
export const openingSingleQuoteRule = defineTextTransformRule({
  on: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))'/g,
  transform: () => '‘',
})

/**
 * @public
 */
export const closingSingleQuoteRule = defineTextTransformRule({
  on: /'/g,
  transform: () => '’',
})

/**
 * @public
 */
export const smartQuotesRules: Array<InputRule> = [
  openingDoubleQuoteRule,
  closingDoubleQuoteRule,
  openingSingleQuoteRule,
  closingSingleQuoteRule,
]

/**
 * @public
 */
export const leftArrowRule = defineTextTransformRule({
  on: /<-/,
  transform: () => '←',
})

/**
 * @public
 */
export const rightArrowRule = defineTextTransformRule({
  on: /->/,
  transform: () => '→',
})

/**
 * @public
 */
export const copyrightRule = defineTextTransformRule({
  on: /\(c\)/,
  transform: () => '©',
})

/**
 * @public
 */
export const servicemarkRule = defineTextTransformRule({
  on: /\(sm\)/,
  transform: () => '℠',
})

/**
 * @public
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
 * @public
 */
export const oneHalfRule = defineTextTransformRule({
  on: /(?:^|\s)(1\/2)\s/,
  transform: () => '½',
})

/**
 * @public
 */
export const plusMinusRule = defineTextTransformRule({
  on: /\+\/-/,
  transform: () => '±',
})

/**
 * @public
 */
export const notEqualRule = defineTextTransformRule({
  on: /!=/,
  transform: () => '≠',
})

/**
 * @public
 */
export const laquoRule = defineTextTransformRule({
  on: /<</,
  transform: () => '«',
})

/**
 * @public
 */
export const raquoRule = defineTextTransformRule({
  on: />>/,
  transform: () => '»',
})

/**
 * @public
 */
export const multiplicationRule = defineTextTransformRule({
  on: /\d+\s?([*x])\s?\d+/,
  transform: () => '×',
})

/**
 * @public
 */
export const superscriptTwoRule = defineTextTransformRule({
  on: /\^2/,
  transform: () => '²',
})

/**
 * @public
 */
export const superscriptThreeRule = defineTextTransformRule({
  on: /\^3/,
  transform: () => '³',
})

/**
 * @public
 */
export const oneQuarterRule = defineTextTransformRule({
  on: /(?:^|\s)(1\/4)\s/,
  transform: () => '¼',
})

/**
 * @public
 */
export const threeQuartersRule = defineTextTransformRule({
  on: /(?:^|\s)(3\/4)\s/,
  transform: () => '¾',
})
