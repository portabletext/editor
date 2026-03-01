import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {fromSlateBlock} from '../internal-utils/values'
import type {Descendant, Node as SlateNode} from '../slate'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Options for {@link parseDOMToPortableText}.
 */
export interface ParseDOMOptions {
  /**
   * The `_type` name used for text blocks in the schema (usually `'block'`).
   * Required so that {@link fromSlateBlock} can distinguish text blocks from
   * block objects when converting Slate nodes to PT.
   */
  textBlockType: string

  /**
   * The WeakMap from DOM elements to Slate nodes, sourced from
   * `editor.elementToNode`. This is the primary mechanism for looking up
   * existing Slate data for DOM elements that haven't been mutated.
   *
   * After the WeakMap migration (commit 80c73781), this lives on the editor
   * object rather than as a global export.
   */
  elementToNode: WeakMap<HTMLElement, SlateNode>

  /**
   * Optional set of DOM nodes whose subtrees have been mutated by the
   * browser since the last render. When provided, the parser will:
   *
   * - **Fast-path** elements whose subtrees are clean — look up the Slate
   *   node via `elementToNode` and convert it with `fromSlateBlock()`.
   * - **Slow-path** elements whose subtrees are dirty — parse text content
   *   directly from the DOM so we capture what the browser actually changed.
   *
   * When omitted, every element is parsed via the slow path (safest, but
   * slightly more work).
   */
  mutatedNodes?: Set<Node>

  /**
   * Only parse block elements whose DOM index falls within `[from, to)`.
   * Useful for large documents where only a small region changed.
   */
  from?: number
  to?: number
}

/**
 * Parse a DOM region (typically the editor root `[data-slate-editor]`) back
 * into an array of Portable Text blocks.
 *
 * This is the core of the hybrid input architecture's "parse" step. After the
 * browser mutates the DOM (e.g. Enter key, IME composition, spellcheck
 * replacement), this function reads the DOM and reconstructs the PT value so
 * it can be diffed against the previous value.
 *
 * The parser uses two strategies:
 *
 * 1. **WeakMap fast path** — For elements that exist in `elementToNode` and
 *    whose subtrees have not been mutated, we read the Slate node directly
 *    and convert it to PT via `fromSlateBlock()`. This is O(1) per block.
 *
 * 2. **DOM slow path** — For new elements (browser-created, e.g. after Enter)
 *    or elements with mutated text content, we walk the DOM tree and
 *    reconstruct spans/marks from `data-slate-*` attributes.
 *
 * @param rootElement - The editor root element or a sub-region to parse.
 * @param options - Parsing options (see {@link ParseDOMOptions}).
 * @returns An array of Portable Text blocks representing the DOM content.
 */
export function parseDOMToPortableText(
  rootElement: HTMLElement,
  options: ParseDOMOptions,
): PortableTextBlock[] {
  const {from, to} = options
  const blocks: PortableTextBlock[] = []

  // Find all top-level block elements (direct children with data-slate-node="element")
  const blockElements = getBlockElements(rootElement)

  const startIndex = from ?? 0
  const endIndex = to ?? blockElements.length

  for (let blockIndex = startIndex; blockIndex < endIndex; blockIndex++) {
    const blockElement = blockElements[blockIndex]
    if (!blockElement) {
      continue
    }

    const parsed = parseDOMElement(blockElement, options)
    if (parsed) {
      blocks.push(parsed)
    }
  }

  return blocks
}

/**
 * Parse a single block-level DOM element into a Portable Text block.
 *
 * The element must have `data-slate-node="element"`. It can be:
 * - A text block (contains `data-slate-node="text"` children)
 * - A void block object (has `data-slate-void="true"`, no inline)
 * - A container (contains nested `data-slate-node="element"` children)
 *
 * @param element - A DOM element with `data-slate-node="element"`.
 * @param options - Parsing options.
 * @returns A Portable Text block, or `null` if the element cannot be parsed.
 */
export function parseDOMElement(
  element: HTMLElement,
  options: ParseDOMOptions,
): PortableTextBlock | null {
  const {textBlockType, elementToNode, mutatedNodes} = options

  // Verify this is a Slate element node
  if (element.getAttribute('data-slate-node') !== 'element') {
    return null
  }

  // -----------------------------------------------------------------------
  // Strategy 1: WeakMap fast path
  // If the element is in elementToNode and its subtree is clean (no
  // mutations), we can just convert the existing Slate node to PT.
  // -----------------------------------------------------------------------
  const slateNode = elementToNode.get(element) as Descendant | undefined
  if (slateNode && !hasSubtreeMutations(element, mutatedNodes)) {
    return fromSlateBlock(slateNode, textBlockType)
  }

  // -----------------------------------------------------------------------
  // Strategy 2: DOM slow path
  // Either the element is new (not in WeakMap) or its subtree was mutated.
  // We need to parse the DOM to get the current state.
  // -----------------------------------------------------------------------

  const isVoid = element.getAttribute('data-slate-void') === 'true'
  const isInline = element.getAttribute('data-slate-inline') === 'true'

  // Void block objects (images, tables, etc.) — we can't parse their custom
  // content from DOM. If we have a Slate node, use it; otherwise we can only
  // return a minimal stub.
  if (isVoid && !isInline) {
    return parseVoidBlockObject(element, slateNode, textBlockType)
  }

  // Check if this is a container (has element children that are themselves
  // block-level elements, not inline elements)
  if (hasBlockElementChildren(element)) {
    return parseContainerBlock(element, slateNode, options)
  }

  // Text block — parse children (text nodes and inline objects) from DOM
  return parseTextBlock(element, slateNode, options)
}

// ---------------------------------------------------------------------------
// Internal: Block type parsers
// ---------------------------------------------------------------------------

/**
 * Parse a void block object (e.g. image, table).
 *
 * Void content is custom-rendered and cannot be reconstructed from DOM.
 * We rely on the Slate node from `elementToNode` for the actual data.
 * If no Slate node exists (browser created this element), we return a
 * minimal stub with whatever `_key` and `_type` we can extract.
 */
function parseVoidBlockObject(
  element: HTMLElement,
  slateNode: Descendant | undefined,
  textBlockType: string,
): PortableTextBlock | null {
  if (slateNode) {
    return fromSlateBlock(slateNode, textBlockType)
  }

  // No Slate node — this is a browser-created void element.
  // We can't reconstruct the void content, but we can create a stub.
  // The caller (diff step) will need to handle this case.
  const key = extractKeyFromSlateNode(element, undefined)
  return {
    _key: key ?? generateTemporaryKey(),
    _type: 'unknown',
  } as PortableTextBlock
}

/**
 * Parse a container block (an element whose children are other block-level
 * elements, not text nodes). This handles nested/grouped blocks.
 *
 * Container blocks are not yet fully supported in PT, but we parse them
 * structurally so the diff step can work with them.
 */
function parseContainerBlock(
  element: HTMLElement,
  slateNode: Descendant | undefined,
  options: ParseDOMOptions,
): PortableTextBlock | null {
  // If we have a clean Slate node, prefer it
  if (slateNode && !hasSubtreeMutations(element, options.mutatedNodes)) {
    return fromSlateBlock(slateNode, options.textBlockType)
  }

  // Extract block-level properties from the Slate node if available
  const key = getNodeProperty(slateNode, '_key') ?? generateTemporaryKey()
  const type = getNodeProperty(slateNode, '_type') ?? options.textBlockType

  // Recursively parse child blocks
  const childElements = getBlockElements(element)
  const childBlocks: PortableTextBlock[] = []

  for (const childElement of childElements) {
    const childBlock = parseDOMElement(childElement, options)
    if (childBlock) {
      childBlocks.push(childBlock)
    }
  }

  // Build the container block. The shape depends on the schema, but
  // structurally it's an element with block children.
  return {
    _key: key,
    _type: type,
    children: childBlocks,
  } as unknown as PortableTextBlock
}

/**
 * Parse a text block — the most common case. A text block contains a mix
 * of text nodes (`data-slate-node="text"`) and inline objects
 * (`data-slate-node="element"` with `data-slate-inline="true"`).
 *
 * We walk the direct children of the block element and build PT spans
 * and inline objects.
 */
function parseTextBlock(
  element: HTMLElement,
  slateNode: Descendant | undefined,
  options: ParseDOMOptions,
): PortableTextBlock | null {
  const {textBlockType} = options

  // Extract block-level properties from the Slate node if available,
  // falling back to DOM-derived values
  const blockKey = getNodeProperty(slateNode, '_key') ?? generateTemporaryKey()
  const blockType = getNodeProperty(slateNode, '_type') ?? textBlockType

  // Extract style, listItem, level, markDefs from the Slate node if available.
  // These properties are not represented in the DOM — they're only in the
  // Slate model. If the Slate node doesn't exist (new block from browser),
  // we use defaults.
  const style = getNodeProperty(slateNode, 'style')
  const listItem = getNodeProperty(slateNode, 'listItem')
  const level = getNodeProperty(slateNode, 'level')
  const markDefs = getNodeProperty(slateNode, 'markDefs')

  // Parse children: walk the element's direct children looking for
  // text nodes and inline objects
  const children = parseTextBlockChildren(element, options)

  // Build the text block
  const block: Record<string, unknown> = {
    _key: blockKey,
    _type: blockType,
    children: children.length > 0 ? children : [createEmptySpan()],
  }

  if (style !== undefined) {
    block['style'] = style
  }
  if (listItem !== undefined) {
    block['listItem'] = listItem
  }
  if (level !== undefined) {
    block['level'] = level
  }
  if (markDefs !== undefined) {
    block['markDefs'] = markDefs
  }

  return block as PortableTextBlock
}

// ---------------------------------------------------------------------------
// Internal: Text block children parsing
// ---------------------------------------------------------------------------

/**
 * Parse the children of a text block element. Children are either:
 * - `[data-slate-node="text"]` — text nodes containing leaves/spans
 * - `[data-slate-node="element"][data-slate-inline="true"]` — inline objects
 */
function parseTextBlockChildren(
  blockElement: HTMLElement,
  options: ParseDOMOptions,
): Array<PortableTextSpan | PortableTextObject> {
  const children: Array<PortableTextSpan | PortableTextObject> = []

  // Find text nodes and inline elements within the block. These may not be
  // direct children — PTE wraps them in a rendered block component (e.g.
  // <p>, <h1>, <blockquote>) that doesn't have data-slate-node. We use
  // querySelectorAll to find them at any depth, but only select direct
  // descendants of the block's content area (not nested inside inline
  // objects or other structures).
  const textAndInlineElements = blockElement.querySelectorAll(
    '[data-slate-node="text"], [data-slate-node="element"][data-slate-inline="true"]',
  )

  for (const childNode of textAndInlineElements) {
    if (!(childNode instanceof HTMLElement)) {
      continue
    }

    const slateNodeType = childNode.getAttribute('data-slate-node')

    if (slateNodeType === 'text') {
      // This is a text node — parse its leaves into spans
      const spans = parseTextNode(childNode, options)
      children.push(...spans)
    } else if (slateNodeType === 'element') {
      // This is an inline element (inline object)
      const inlineObject = parseInlineObject(childNode, options)
      if (inlineObject) {
        children.push(inlineObject)
      }
    }
  }

  return children
}

/**
 * Parse a `[data-slate-node="text"]` element into one or more PT spans.
 *
 * A text node contains one or more `[data-slate-leaf]` elements. Each leaf
 * represents a segment of text with uniform formatting (marks). We parse
 * each leaf into a PT span.
 *
 * For marks, we prefer the Slate text node from `elementToNode` because
 * DOM mark elements (`<strong>`, `<em>`) don't capture annotations (which
 * have no DOM representation). If the Slate node isn't available (new
 * content from browser), we fall back to inferring marks from DOM elements.
 */
function parseTextNode(
  textElement: HTMLElement,
  options: ParseDOMOptions,
): PortableTextSpan[] {
  const spans: PortableTextSpan[] = []
  const leafElements = Array.from(
    textElement.querySelectorAll('[data-slate-leaf]'),
  )

  for (const leafElement of leafElements) {
    if (!(leafElement instanceof HTMLElement)) {
      continue
    }

    const span = parseLeafElement(leafElement, textElement, options)
    if (span) {
      spans.push(span)
    }
  }

  return spans
}

/**
 * Parse a `[data-slate-leaf]` element into a PT span.
 *
 * A leaf element contains either:
 * - `[data-slate-string]` — actual text content
 * - `[data-slate-zero-width]` — empty/zero-width placeholder
 *
 * Marks are determined by:
 * 1. Looking up the Slate text node via `elementToNode` (preferred)
 * 2. Falling back to inferring marks from wrapper DOM elements
 */
function parseLeafElement(
  leafElement: HTMLElement,
  parentTextElement: HTMLElement,
  options: ParseDOMOptions,
): PortableTextSpan | null {
  const {elementToNode} = options

  // Extract text content
  const textContent = extractLeafText(leafElement)

  // Extract marks
  const marks = extractLeafMarks(leafElement, parentTextElement, elementToNode)

  // Extract key from the parent text node's Slate node, or generate one
  const parentSlateNode = elementToNode.get(parentTextElement)

  const rawKey = getNodeProperty(
    parentSlateNode as Descendant | undefined,
    '_key',
  )
  const spanKey = typeof rawKey === 'string' ? rawKey : generateTemporaryKey()

  return {
    _key: spanKey,
    _type: 'span',
    text: textContent,
    marks,
  }
}

/**
 * Parse an inline object element (`[data-slate-node="element"][data-slate-inline]`).
 *
 * Inline objects are void elements — their content is custom-rendered and
 * cannot be reconstructed from DOM. We must use the Slate node from
 * `elementToNode`.
 */
function parseInlineObject(
  inlineElement: HTMLElement,
  options: ParseDOMOptions,
): PortableTextObject | null {
  const {elementToNode} = options
  const slateNode = elementToNode.get(inlineElement) as Descendant | undefined

  if (slateNode) {
    // The Slate inline object has the shape:
    // { _type, _key, children: [void-child], value: {...}, __inline: true }
    // We need to unwrap the `value` property to get the PT inline object.
    const key = getNodeProperty(slateNode, '_key') ?? generateTemporaryKey()
    const type = getNodeProperty(slateNode, '_type') ?? 'unknown'
    const value =
      'value' in slateNode && typeof slateNode.value === 'object'
        ? (slateNode.value as Record<string, unknown>)
        : {}

    return {
      _key: key,
      _type: type,
      ...value,
    } as PortableTextObject
  }

  // No Slate node — browser-created inline element. Return a stub.
  const key = generateTemporaryKey()
  return {
    _key: key,
    _type: 'unknown',
  } as PortableTextObject
}

// ---------------------------------------------------------------------------
// Internal: Leaf text and mark extraction
// ---------------------------------------------------------------------------

/**
 * Extract the text content from a leaf element.
 *
 * Looks for `[data-slate-string]` for actual text, or
 * `[data-slate-zero-width]` for empty content.
 */
function extractLeafText(leafElement: HTMLElement): string {
  // Check for actual text content
  const stringElement = leafElement.querySelector('[data-slate-string]')
  if (stringElement) {
    return stringElement.textContent ?? ''
  }

  // Check for zero-width (empty) content — but only if it's truly empty.
  // During IME composition, the browser may type into a zero-width element,
  // replacing the zero-width space with actual text. We need to check the
  // actual text content, not just the presence of the attribute.
  const zeroWidthElement = leafElement.querySelector('[data-slate-zero-width]')
  if (zeroWidthElement) {
    const rawText = (zeroWidthElement.textContent ?? '').replace(/\uFEFF/g, '')
    if (rawText.length > 0) {
      return rawText
    }
    return ''
  }

  // Fallback: read textContent directly, stripping zero-width chars
  const rawText = leafElement.textContent ?? ''
  return rawText.replace(/\uFEFF/g, '')
}

/**
 * Extract marks from a leaf element.
 *
 * **Strategy 1 (preferred):** Look up the Slate text node via
 * `elementToNode`. The Slate text node has the marks as a direct property
 * (e.g., `{ text: "hello", marks: ["strong", "em"], _key: "..." }`).
 *
 * **Strategy 2 (fallback):** Infer marks from DOM wrapper elements. This
 * only catches decorator marks (bold, italic, etc.) — not annotations
 * (links, comments) which have no DOM representation.
 */
function extractLeafMarks(
  leafElement: HTMLElement,
  parentTextElement: HTMLElement,
  elementToNode: WeakMap<HTMLElement, SlateNode>,
): string[] {
  // Strategy 1: Use Slate text node from the editor's elementToNode map
  // The Text component registers the [data-slate-node="text"] span in
  // elementToNode. The Slate Text node has marks as a direct property.
  const slateTextNode = elementToNode.get(parentTextElement) as
    | Record<string, unknown>
    | undefined

  if (slateTextNode && Array.isArray(slateTextNode['marks'])) {
    // The Slate text node has a single set of marks, but if there are
    // decorations, each leaf may have different marks. The leaf's marks
    // come from `Text.decorations()` which splits the text node into
    // decorated leaves. We can't easily map back from a DOM leaf to its
    // specific decorated leaf without position tracking.
    //
    // For the common case (no decorations), all leaves share the same
    // marks as the parent text node.
    return slateTextNode['marks'] as string[]
  }

  // Strategy 2: Infer marks from DOM elements wrapping the leaf content
  return inferMarksFromDOM(leafElement)
}

/**
 * Map of HTML element tag names to PT decorator mark names.
 *
 * This covers the standard decorator marks that PTE renders as HTML elements.
 * Custom decorators rendered via `renderLeaf` may use different elements —
 * those won't be caught by this fallback.
 */
const TAG_TO_MARK: Record<string, string> = {
  STRONG: 'strong',
  B: 'strong',
  EM: 'em',
  I: 'em',
  U: 'underline',
  S: 'strike-through',
  DEL: 'strike-through',
  CODE: 'code',
  SUB: 'sub',
  SUP: 'sup',
}

/**
 * Infer decorator marks by walking the DOM elements between the leaf
 * element and the `[data-slate-string]` or `[data-slate-zero-width]`
 * content element.
 *
 * For example, in:
 * ```html
 * <span data-slate-leaf>
 *   <strong>
 *     <em>
 *       <span data-slate-string>text</span>
 *     </em>
 *   </strong>
 * </span>
 * ```
 * We'd infer marks `['strong', 'em']`.
 *
 * **Limitation:** This only catches decorator marks with DOM representation.
 * Annotations (links, comments) are applied via `marks` array on the Slate
 * text node and have no corresponding DOM wrapper element.
 */
function inferMarksFromDOM(leafElement: HTMLElement): string[] {
  const marks: string[] = []

  // Walk from the leaf element inward toward the text content
  const contentElement =
    leafElement.querySelector('[data-slate-string]') ??
    leafElement.querySelector('[data-slate-zero-width]')

  if (!contentElement) {
    return marks
  }

  // Walk up from the content element to the leaf, collecting mark elements
  let currentNode: HTMLElement | null = contentElement.parentElement
  while (currentNode && currentNode !== leafElement) {
    const markName = TAG_TO_MARK[currentNode.tagName]
    if (markName) {
      marks.push(markName)
    }
    currentNode = currentNode.parentElement
  }

  return marks
}

// ---------------------------------------------------------------------------
// Internal: DOM traversal utilities
// ---------------------------------------------------------------------------

/**
 * Get all direct child elements that are Slate block elements
 * (`[data-slate-node="element"]` and NOT `[data-slate-inline="true"]`).
 */
function getBlockElements(parentElement: HTMLElement): HTMLElement[] {
  const blockElements: HTMLElement[] = []

  const childElements = Array.from(parentElement.children)
  for (const childNode of childElements) {
    if (!(childNode instanceof HTMLElement)) {
      continue
    }

    if (
      childNode.getAttribute('data-slate-node') === 'element' &&
      childNode.getAttribute('data-slate-inline') !== 'true'
    ) {
      blockElements.push(childNode)
    }
  }

  return blockElements
}

/**
 * Check whether an element has block-level element children (i.e., it's a
 * container, not a text block).
 *
 * A text block's direct children are `[data-slate-node="text"]` and
 * inline `[data-slate-node="element"]`. A container's direct children are
 * non-inline `[data-slate-node="element"]`.
 */
function hasBlockElementChildren(element: HTMLElement): boolean {
  const childElements = Array.from(element.children)
  for (const childNode of childElements) {
    if (!(childNode instanceof HTMLElement)) {
      continue
    }

    if (
      childNode.getAttribute('data-slate-node') === 'element' &&
      childNode.getAttribute('data-slate-inline') !== 'true'
    ) {
      return true
    }
  }

  return false
}

/**
 * Check whether any node in the element's subtree has been mutated.
 *
 * If `mutatedNodes` is not provided, we conservatively assume the subtree
 * IS mutated (forcing the slow path).
 */
function hasSubtreeMutations(
  element: HTMLElement,
  mutatedNodes: Set<Node> | undefined,
): boolean {
  if (!mutatedNodes) {
    // No mutation tracking — assume everything is dirty
    return true
  }

  if (mutatedNodes.size === 0) {
    return false
  }

  // Check if the element itself or any of its descendants are in the set
  if (mutatedNodes.has(element)) {
    return true
  }

  // Walk the mutated nodes and check if any are descendants of this element
  for (const mutatedNode of mutatedNodes) {
    if (element.contains(mutatedNode)) {
      return true
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// Internal: Property extraction utilities
// ---------------------------------------------------------------------------

/**
 * Safely get a named property from a Slate node (which may be a Descendant
 * with index-signature restrictions).
 */
function getNodeProperty(
  slateNode: Descendant | undefined,
  propertyName: string,
): unknown {
  if (!slateNode) {
    return undefined
  }

  // Use bracket notation to satisfy TypeScript's noPropertyAccessFromIndexSignature
  return (slateNode as unknown as Record<string, unknown>)[propertyName]
}

/**
 * Try to extract a `_key` from a DOM element by looking up its Slate node.
 *
 * PTE doesn't store `_key` as a data attribute on DOM elements, so the key
 * is only available via the Slate node in `elementToNode`.
 */
function extractKeyFromSlateNode(
  _element: HTMLElement,
  slateNode: Descendant | undefined,
): string | null {
  if (slateNode) {
    const key = getNodeProperty(slateNode, '_key')
    if (typeof key === 'string') {
      return key
    }
  }

  return null
}

/**
 * Create an empty span — used as the default child when a text block
 * has no parseable content.
 */
function createEmptySpan(): PortableTextSpan {
  return {
    _key: generateTemporaryKey(),
    _type: 'span',
    text: '',
    marks: [],
  }
}

// ---------------------------------------------------------------------------
// Internal: Key generation
// ---------------------------------------------------------------------------

let temporaryKeyCounter = 0

/**
 * Generate a temporary key for DOM-parsed nodes that don't have a Slate
 * node to read a key from.
 *
 * These keys are prefixed with `dom-` to distinguish them from real PT keys.
 * The diff step should replace them with proper keys when reconciling.
 */
function generateTemporaryKey(): string {
  temporaryKeyCounter++
  return `dom-${temporaryKeyCounter}`
}

/**
 * Reset the temporary key counter. Useful for testing.
 * @internal
 */
export function _resetTemporaryKeyCounter(): void {
  temporaryKeyCounter = 0
}
