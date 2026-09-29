import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {
  compileSchema,
  defineSchema,
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {
  createTestKeyGenerator,
  fromTextspec,
  toTextspec,
  type TextspecSelection,
} from '@portabletext/test'
import {parse} from '@textspec/notation'

const schema = compileSchema(
  defineSchema({styles: [{name: 'h1'}, {name: 'h2'}]}),
)

/**
 * A collapsed selection: a block key plus a character offset into the
 * block's text.
 */
export type Caret = {blockKey: string; offset: number}

/**
 * What an action did, in terms undo can check against the content at undo
 * time: text typed into a span at an offset, a block's style set, a
 * block inserted, or a block deleted next to its siblings.
 */
export type UndoStep =
  | {
      type: 'typed'
      blockKey: string
      spanKey: string
      offset: number
      text: string
    }
  | {type: 'styled'; blockKey: string; style: string}
  | {type: 'inserted'; blockKey: string}
  | {
      type: 'deleted'
      block: PortableTextBlock
      previousKey: string | undefined
      nextKey: string | undefined
    }

/**
 * What a user action produced: the patches the editor sends, and what undo
 * needs to revert it. Creating the block from the placeholder isn't part of
 * the undo step.
 */
export type ActionResult = {
  patches: Array<Patch>
  undoStep: UndoStep | undefined
}

export type Document = {
  /** The content on screen, the placeholder included. */
  getValue: () => Array<PortableTextBlock>
  getCaret: () => Caret
  /** Puts the caret at a block key and offset. Throws if either is invalid. */
  setCaret: (caret: Caret) => void
  getSelection: () => TextspecSelection
  /** The key of the placeholder block, while one is shown. */
  getPlaceholderKey: () => string | undefined
  /**
   * Replaces the content on screen. Empty content shows the placeholder. The
   * caret stays in its block if the block survives.
   */
  setValue: (value: Array<PortableTextBlock> | undefined) => void
  toTextspec: (options?: {keys?: boolean}) => string
  setStyle: (style: string) => ActionResult
  type: (text: string) => ActionResult
  /**
   * Deletes text that ends at the caret within the caret's span, as a run of
   * backspaces. Throws if the text isn't right before the caret. Undo doesn't
   * revert it.
   */
  deleteBeforeCaret: (text: string) => ActionResult
  putCaretAfter: (text: string) => void
  insertBlock: (textspec: string) => ActionResult
  deleteBlock: (text: string) => ActionResult
  /**
   * Removes typed text from its span, at the occurrence nearest its offset.
   * Returns no patches when the span no longer holds the text.
   */
  deleteText: (typed: Extract<UndoStep, {type: 'typed'}>) => Array<Patch>
  /** Returns no patches when the block is gone. */
  setBlockStyle: (blockKey: string, style: string | undefined) => Array<Patch>
  /** Returns no patches when the block is gone. */
  deleteBlockByKey: (blockKey: string) => Array<Patch>
  /**
   * Puts a deleted block back after its previous sibling, or else before its
   * next one, or else first. Returns no patches when its key is on screen.
   */
  restoreBlock: (deleted: Extract<UndoStep, {type: 'deleted'}>) => Array<Patch>
}

export function createDocument(
  context: {keyGenerator: () => string},
  initial: {value: Array<PortableTextBlock> | undefined; caret?: Caret},
): Document {
  let value: Array<PortableTextBlock> = []
  let placeholderKey: string | undefined
  let caret: Caret = {blockKey: '', offset: 0}

  setValue(initial.value)

  if (initial.caret) {
    placeCaret(initial.caret)
  }

  function setValue(nextValue: Array<PortableTextBlock> | undefined) {
    if (nextValue === undefined || nextValue.length === 0) {
      if (placeholderKey === undefined) {
        const placeholder = createPlaceholder(context.keyGenerator)
        placeholderKey = placeholder._key
        value = [placeholder]
      }
    } else {
      placeholderKey = undefined
      value = nextValue
    }

    const caretBlock = value.find((block) => block._key === caret.blockKey)

    caret = caretBlock
      ? {
          blockKey: caret.blockKey,
          offset: Math.min(caret.offset, getTextBlock(caretBlock).text.length),
        }
      : {blockKey: value[0]._key, offset: 0}
  }

  function placeCaret(nextCaret: Caret) {
    const block = value.find(
      (candidate) => candidate._key === nextCaret.blockKey,
    )

    if (!block) {
      throw new Error(`No block with key "${nextCaret.blockKey}"`)
    }

    if (nextCaret.offset > getTextBlock(block).text.length) {
      throw new Error(
        `Offset ${nextCaret.offset} is past the end of block "${nextCaret.blockKey}"`,
      )
    }

    caret = nextCaret
  }

  function getSelection(): TextspecSelection {
    const block = getTextBlock(findBlock(caret.blockKey))
    const {span, offset} = locateSpan(block.block, caret.offset)
    const point = {
      path: [{_key: block.block._key}, 'children', {_key: span._key}],
      offset,
    }

    return {anchor: point, focus: point}
  }

  function findBlock(key: string) {
    const block = value.find((candidate) => candidate._key === key)

    if (!block) {
      throw new Error(`No block with key "${key}"`)
    }

    return block
  }

  function withPlaceholderCreation(patches: Array<Patch>): Array<Patch> {
    if (placeholderKey === undefined) {
      return patches
    }

    const placeholder = findBlock(placeholderKey)
    placeholderKey = undefined

    return [
      setIfMissing([], []),
      insert([placeholder], 'before', [0]),
      ...patches,
    ]
  }

  function setStyle(style: string): ActionResult {
    const block = getTextBlock(findBlock(caret.blockKey)).block

    return {
      patches: setBlockStyle(block._key, style),
      undoStep: {
        type: 'styled',
        blockKey: block._key,
        style,
      },
    }
  }

  function setBlockStyle(
    blockKey: string,
    style: string | undefined,
  ): Array<Patch> {
    if (
      style !== undefined &&
      !schema.styles.some((definition) => definition.name === style)
    ) {
      throw new Error(`Unknown style "${style}"`)
    }

    const blockIndex = value.findIndex((block) => block._key === blockKey)

    if (blockIndex === -1) {
      return []
    }

    const {style: _previousStyle, ...block} = getTextBlock(
      value[blockIndex],
    ).block
    const path = [{_key: blockKey}, 'style']
    const patches = withPlaceholderCreation([
      style === undefined ? unset(path) : set(style, path),
    ])

    value = replaceAt(
      value,
      blockIndex,
      style === undefined ? block : {...block, style},
    )

    return patches
  }

  function type(text: string): ActionResult {
    const blockIndex = value.findIndex((block) => block._key === caret.blockKey)
    const block = getTextBlock(value[blockIndex]).block
    const {span, offset} = locateSpan(block, caret.offset)
    const nextText = span.text.slice(0, offset) + text + span.text.slice(offset)
    const path = [{_key: block._key}, 'children', {_key: span._key}, 'text']
    const patches = withPlaceholderCreation([
      diffMatchPatch(span.text, nextText, path),
    ])

    value = replaceAt(value, blockIndex, {
      ...block,
      children: block.children.map((child) =>
        child._key === span._key ? {...span, text: nextText} : child,
      ),
    })
    caret = {blockKey: block._key, offset: caret.offset + text.length}

    return {
      patches,
      undoStep: {
        type: 'typed',
        blockKey: block._key,
        spanKey: span._key,
        offset,
        text,
      },
    }
  }

  function deleteBeforeCaret(text: string): ActionResult {
    const blockIndex = value.findIndex((block) => block._key === caret.blockKey)
    const block = getTextBlock(value[blockIndex]).block
    const {span, offset} = locateSpan(block, caret.offset)
    const start = offset - text.length

    if (text === '' || start < 0 || span.text.slice(start, offset) !== text) {
      throw new Error(
        `Expected "${text}" right before the caret, found "${span.text.slice(0, offset)}"`,
      )
    }

    const nextText = span.text.slice(0, start) + span.text.slice(offset)
    const path = [{_key: block._key}, 'children', {_key: span._key}, 'text']

    value = replaceAt(value, blockIndex, {
      ...block,
      children: block.children.map((child) =>
        child._key === span._key ? {...span, text: nextText} : child,
      ),
    })
    caret = {blockKey: block._key, offset: caret.offset - text.length}

    return {
      patches: [diffMatchPatch(span.text, nextText, path)],
      undoStep: undefined,
    }
  }

  function deleteText(typed: Extract<UndoStep, {type: 'typed'}>): Array<Patch> {
    const blockIndex = value.findIndex((block) => block._key === typed.blockKey)

    if (blockIndex === -1) {
      return []
    }

    const block = getTextBlock(value[blockIndex]).block
    const spanIndex = block.children.findIndex(
      (child) => child._key === typed.spanKey && isSpan({schema}, child),
    )
    const span = block.children[spanIndex]

    if (spanIndex === -1 || !isSpan({schema}, span)) {
      return []
    }

    const typedOffset = findNearest(span.text, typed.text, typed.offset)

    if (typedOffset === undefined) {
      return []
    }

    const nextText =
      span.text.slice(0, typedOffset) +
      span.text.slice(typedOffset + typed.text.length)
    const spanStart = block.children
      .slice(0, spanIndex)
      .reduce(
        (length, child) =>
          length + (isSpan({schema}, child) ? child.text.length : 0),
        0,
      )
    const deletionStart = spanStart + typedOffset

    value = replaceAt(value, blockIndex, {
      ...block,
      children: block.children.map((child) =>
        child._key === span._key ? {...span, text: nextText} : child,
      ),
    })

    if (caret.blockKey === block._key && caret.offset > deletionStart) {
      caret = {
        blockKey: block._key,
        offset:
          deletionStart +
          Math.max(0, caret.offset - deletionStart - typed.text.length),
      }
    }

    return [
      diffMatchPatch(span.text, nextText, [
        {_key: block._key},
        'children',
        {_key: span._key},
        'text',
      ]),
    ]
  }

  function putCaretAfter(text: string) {
    const matches = value.flatMap((block) => {
      const blockText = getTextBlock(block).text
      const offsets: Array<Caret> = []
      let index = blockText.indexOf(text)

      while (index !== -1) {
        offsets.push({blockKey: block._key, offset: index + text.length})
        index = blockText.indexOf(text, index + 1)
      }

      return offsets
    })

    if (matches.length !== 1) {
      throw new Error(
        `Expected "${text}" to occur once, found it ${matches.length} times`,
      )
    }

    caret = matches[0]
  }

  function insertBlock(textspec: string): ActionResult {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: context.keyGenerator},
      textspec,
    )

    if (blocks.length !== 1) {
      throw new Error(
        `Expected one block in "${textspec}", found ${blocks.length}`,
      )
    }

    const siblingKeys = new Set(value.map((block) => block._key))
    const newBlock = siblingKeys.has(blocks[0]._key)
      ? {
          ...blocks[0],
          _key: generateUniqueKey(context.keyGenerator, siblingKeys),
        }
      : blocks[0]
    const caretBlockKey = caret.blockKey
    const blockIndex = value.findIndex((block) => block._key === caretBlockKey)
    const patches = withPlaceholderCreation([
      insert([newBlock], 'after', [{_key: caretBlockKey}]),
    ])

    value = [
      ...value.slice(0, blockIndex + 1),
      newBlock,
      ...value.slice(blockIndex + 1),
    ]
    caret = {
      blockKey: newBlock._key,
      offset: getTextBlock(newBlock).text.length,
    }

    return {patches, undoStep: {type: 'inserted', blockKey: newBlock._key}}
  }

  function deleteBlock(text: string): ActionResult {
    const matches = value.filter((block) => getTextBlock(block).text === text)

    if (matches.length !== 1) {
      throw new Error(
        `Expected one block with the text "${text}", found ${matches.length}`,
      )
    }

    const block = matches[0]

    if (block._key === placeholderKey) {
      return {patches: [], undoStep: undefined}
    }

    const blockIndex = value.indexOf(block)
    const undoStep: UndoStep = {
      type: 'deleted',
      block,
      previousKey: value[blockIndex - 1]?._key,
      nextKey: value[blockIndex + 1]?._key,
    }

    return {patches: deleteBlockByKey(block._key), undoStep}
  }

  function deleteBlockByKey(blockKey: string): Array<Patch> {
    const blockIndex = value.findIndex((block) => block._key === blockKey)

    if (blockIndex === -1 || blockKey === placeholderKey) {
      return []
    }

    const previousBlock = value[blockIndex - 1]
    const nextBlock = value[blockIndex + 1]
    const remainingValue = value.filter((block) => block._key !== blockKey)

    if (remainingValue.length === 0) {
      setValue(undefined)

      return [unset([{_key: blockKey}]), unset([])]
    }

    if (caret.blockKey === blockKey) {
      caret = previousBlock
        ? {
            blockKey: previousBlock._key,
            offset: getTextBlock(previousBlock).text.length,
          }
        : {blockKey: nextBlock._key, offset: 0}
    }

    value = remainingValue

    return [unset([{_key: blockKey}])]
  }

  function restoreBlock(
    deleted: Extract<UndoStep, {type: 'deleted'}>,
  ): Array<Patch> {
    const {block} = deleted

    if (value.some((candidate) => candidate._key === block._key)) {
      return []
    }

    if (placeholderKey !== undefined) {
      setValue([block])

      return [setIfMissing([], []), insert([block], 'before', [0])]
    }

    const previousIndex = value.findIndex(
      (candidate) => candidate._key === deleted.previousKey,
    )
    const nextIndex = value.findIndex(
      (candidate) => candidate._key === deleted.nextKey,
    )

    if (previousIndex !== -1) {
      value = [
        ...value.slice(0, previousIndex + 1),
        block,
        ...value.slice(previousIndex + 1),
      ]

      return [insert([block], 'after', [{_key: value[previousIndex]._key}])]
    }

    const referenceIndex = nextIndex === -1 ? 0 : nextIndex
    const reference = value[referenceIndex]._key
    value = [
      ...value.slice(0, referenceIndex),
      block,
      ...value.slice(referenceIndex),
    ]

    return [insert([block], 'before', [{_key: reference}])]
  }

  return {
    getValue: () => value,
    getCaret: () => caret,
    setCaret: placeCaret,
    getSelection,
    getPlaceholderKey: () => placeholderKey,
    setValue,
    toTextspec: (options) =>
      serializeTextspec({
        value,
        selection: getSelection(),
        keys: options?.keys ?? false,
      }),
    setStyle,
    type,
    deleteBeforeCaret,
    putCaretAfter,
    insertBlock,
    deleteBlock,
    deleteText,
    setBlockStyle,
    deleteBlockByKey,
    restoreBlock,
  }
}

/**
 * Calls the key generator until it returns a key that isn't taken, and marks
 * that key as taken.
 */
export function generateUniqueKey(
  keyGenerator: () => string,
  takenKeys: Set<string>,
): string {
  let key = keyGenerator()

  while (takenKeys.has(key)) {
    key = keyGenerator()
  }

  takenKeys.add(key)

  return key
}

/**
 * Parses textspec into content and a caret. The caret is `undefined` when the
 * notation has none.
 */
export function parseTextspec(
  context: {keyGenerator: () => string},
  textspec: string,
): {value: Array<PortableTextBlock>; caret: Caret | undefined} {
  const {blocks, selection} = fromTextspec(
    {schema, keyGenerator: context.keyGenerator},
    textspec,
  )

  if (!hasCaret(textspec) || !selection) {
    return {value: blocks, caret: undefined}
  }

  const [blockSegment, , spanSegment] = selection.focus.path
  const block = blocks.find(
    (candidate) =>
      typeof blockSegment === 'object' &&
      '_key' in blockSegment &&
      candidate._key === blockSegment._key,
  )

  if (!block) {
    throw new Error(`The caret in "${textspec}" is not in a block`)
  }

  const textBlock = getTextBlock(block).block
  let offset = selection.focus.offset

  for (const child of textBlock.children) {
    if (
      typeof spanSegment === 'object' &&
      '_key' in spanSegment &&
      child._key === spanSegment._key
    ) {
      break
    }

    offset += isSpan({schema}, child) ? child.text.length : 0
  }

  return {value: blocks, caret: {blockKey: block._key, offset}}
}

/**
 * Turns an actual state and an expected notation into two strings to compare.
 * Keys are compared only for the blocks whose keys the expected notation
 * names, and the caret only when the expected notation has one.
 */
export function comparableTextspec(
  actual: {value: Array<PortableTextBlock>; selection: TextspecSelection},
  expected: string,
): {actual: string; expected: string} {
  const parsed = fromTextspec(
    {schema, keyGenerator: createTestKeyGenerator('expected-')},
    expected,
  )
  const namedKeys = new Set(
    parse(hasCaret(expected) ? expected : `${expected}|`).blocks.flatMap(
      (block) =>
        typeof block.attrs?.['_key'] === 'string' ? [block.attrs['_key']] : [],
    ),
  )
  const keys = namedKeys.size > 0 ? namedKeys : false
  const compareCaret = hasCaret(expected)

  return {
    actual: serializeTextspec({
      value: actual.value,
      selection: compareCaret ? actual.selection : null,
      keys,
    }),
    expected: serializeTextspec({
      value: parsed.blocks,
      selection: compareCaret ? parsed.selection : null,
      keys,
    }),
  }
}

/**
 * Content as one line of textspec, without a caret. Empty content is an empty
 * string.
 */
export function formatTextspec(
  value: Array<PortableTextBlock>,
  options?: {keys?: boolean},
): string {
  return serializeTextspec({
    value,
    selection: null,
    keys: options?.keys ?? false,
  })
}

/**
 * Whether a batch turns the placeholder into content: it starts with a
 * whole-field `setIfMissing` followed by an `insert`.
 */
export function createsBlock(patches: Array<Patch>): boolean {
  const [first, second] = patches

  return (
    first?.type === 'setIfMissing' &&
    first.path.length === 0 &&
    second?.type === 'insert'
  )
}

/**
 * Whether a batch empties the field: it contains a whole-field `unset`.
 */
export function emptiesField(patches: Array<Patch>): boolean {
  return patches.some(
    (patch) => patch.type === 'unset' && patch.path.length === 0,
  )
}

function createPlaceholder(keyGenerator: () => string): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keyGenerator(), text: '', marks: []}],
  }
}

function getTextBlock(block: PortableTextBlock | undefined): {
  block: PortableTextTextBlock
  text: string
} {
  if (!block || !isTextBlock({schema}, block)) {
    throw new Error(`Expected a text block, got ${JSON.stringify(block)}`)
  }

  const text = block.children
    .map((child) => (isSpan({schema}, child) ? child.text : ''))
    .join('')

  return {block, text}
}

function locateSpan(
  block: PortableTextTextBlock,
  blockOffset: number,
): {span: PortableTextSpan; offset: number} {
  const spans = block.children.filter((child) => isSpan({schema}, child))
  let remaining = blockOffset

  for (const span of spans) {
    if (remaining <= span.text.length) {
      return {span, offset: remaining}
    }

    remaining -= span.text.length
  }

  throw new Error(
    `Offset ${blockOffset} is past the end of block "${block._key}"`,
  )
}

/**
 * The start of the occurrence of `search` in `text` nearest `offset`, looking
 * after the offset first at each distance.
 */
function findNearest(
  text: string,
  search: string,
  offset: number,
): number | undefined {
  for (
    let distance = 0;
    distance <= Math.max(offset, text.length);
    distance++
  ) {
    for (const candidate of [offset + distance, offset - distance]) {
      if (candidate >= 0 && text.startsWith(search, candidate)) {
        return candidate
      }
    }
  }

  return undefined
}

function replaceAt<TItem>(
  items: Array<TItem>,
  index: number,
  item: TItem,
): Array<TItem> {
  return items.map((candidate, candidateIndex) =>
    candidateIndex === index ? item : candidate,
  )
}

function hasCaret(textspec: string): boolean {
  return /(?<!\\)[|^]/.test(textspec)
}

/**
 * Serializes single-line textspec, one block at a time so each block's prefix
 * can be written the way the scenarios write it: `H1: foo` rather than the
 * `B style="h1": foo` that `toTextspec` produces.
 */
function serializeTextspec({
  value,
  selection,
  keys,
}: {
  value: Array<PortableTextBlock>
  selection: TextspecSelection
  keys: boolean | Set<string>
}): string {
  return value
    .map((block) =>
      toTextspec(
        {schema, value: [block], selection},
        {singleLine: true, keys},
      ).replace(
        /^B( _key="[^"]*")? style="([a-z][a-z0-9]*)"(?=:)/,
        (_match, keyAttribute: string | undefined, style: string) =>
          `${style.toUpperCase()}${keyAttribute ?? ''}`,
      ),
    )
    .join(';;')
}
