// Plugin
export {DOMEditor, type DOMEditorInterface} from './plugin/dom-editor'
export {withDOM} from './plugin/with-dom'

// Utils
export {TRIPLE_CLICK} from './utils/constants'

export {
  applyStringDiff,
  mergeStringDiffs,
  normalizePoint,
  normalizeRange,
  normalizeStringDiff,
  type StringDiff,
  targetRange,
  type TextDiff,
  verifyDiffState,
} from './utils/diff-text'

export {
  containsShadowAware,
  type DOMElement,
  type DOMNode,
  type DOMRange,
  DOMText,
  getActiveElement,
  getDefaultView,
  getSelection,
  isDOMElement,
  isDOMNode,
  isDOMSelection,
  isPlainTextOnlyPaste,
  isTrackedMutation,
} from './utils/dom'

export {
  CAN_USE_DOM,
  HAS_BEFORE_INPUT_SUPPORT,
  IS_ANDROID,
  IS_CHROME,
  IS_FIREFOX,
  IS_FIREFOX_LEGACY,
  IS_IOS,
  IS_WEBKIT,
  IS_UC_MOBILE,
  IS_WECHATBROWSER,
} from './utils/environment'

export {default as Hotkeys} from './utils/hotkeys'

export {Key} from './utils/key'

export {
  isElementDecorationsEqual,
  isTextDecorationsEqual,
  splitDecorationsByChild,
} from './utils/range-list'

export {MARK_PLACEHOLDER_SYMBOL, PLACEHOLDER_SYMBOL} from './utils/symbols'

export type {Action} from './plugin/dom-editor'
