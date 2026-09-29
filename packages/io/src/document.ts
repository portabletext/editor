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
  fromTextspec,
  toTextspec,
  type TextspecSelection,
} from '@portabletext/test'

const schema = compileSchema(
  defineSchema({styles: [{name: 'h1'}, {name: 'h2'}]}),
)

/**
 * A collapsed selection: a block key plus a character offset into the
 * block's text.
 */
export type Caret = {blockKey: string; offset: number}

/**
 * What a user action produced: the patches the editor sends, and the patches
 * that undo them, in the order they apply.
 */
export type ActionResult = {
  patches: Array<Patch>
  inversePatches: Array<Patch>
}

export type Document = {
  /** The content on screen, the placeholder included. */
  getValue: () => Array<PortableTextBlock>
  getCaret: () => Caret
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
  putCaretAfter: (text: string) => void
  insertBlock: (textspec: string) => ActionResult
  deleteBlock: (text: string) => ActionResult
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

  function withPlaceholderCreation(result: ActionResult): ActionResult {
    if (placeholderKey === undefined) {
      return result
    }

    const placeholder = findBlock(placeholderKey)
    const createdKey = placeholderKey
    placeholderKey = undefined

    return {
      patches: [
        setIfMissing([], []),
        insert([placeholder], 'before', [0]),
        ...result.patches,
      ],
      inversePatches: [
        ...result.inversePatches,
        unset([{_key: createdKey}]),
        unset([]),
      ],
    }
  }

  function setStyle(style: string): ActionResult {
    if (!schema.styles.some((definition) => definition.name === style)) {
      throw new Error(`Unknown style "${style}"`)
    }

    const blockIndex = value.findIndex((block) => block._key === caret.blockKey)
    const block = getTextBlock(value[blockIndex]).block
    const path = [{_key: block._key}, 'style']
    const result = withPlaceholderCreation({
      patches: [set(style, path)],
      inversePatches: [
        block.style === undefined ? unset(path) : set(block.style, path),
      ],
    })

    value = replaceAt(value, blockIndex, {...block, style})

    return result
  }

  function type(text: string): ActionResult {
    const blockIndex = value.findIndex((block) => block._key === caret.blockKey)
    const block = getTextBlock(value[blockIndex]).block
    const {span, offset} = locateSpan(block, caret.offset)
    const nextText = span.text.slice(0, offset) + text + span.text.slice(offset)
    const path = [{_key: block._key}, 'children', {_key: span._key}, 'text']
    const result = withPlaceholderCreation({
      patches: [diffMatchPatch(span.text, nextText, path)],
      inversePatches: [diffMatchPatch(nextText, span.text, path)],
    })

    value = replaceAt(value, blockIndex, {
      ...block,
      children: block.children.map((child) =>
        child._key === span._key ? {...span, text: nextText} : child,
      ),
    })
    caret = {blockKey: block._key, offset: caret.offset + text.length}

    return result
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

    const newBlock = blocks[0]
    const caretBlockKey = caret.blockKey
    const blockIndex = value.findIndex((block) => block._key === caretBlockKey)
    const result = withPlaceholderCreation({
      patches: [insert([newBlock], 'after', [{_key: caretBlockKey}])],
      inversePatches: [unset([{_key: newBlock._key}])],
    })

    value = [
      ...value.slice(0, blockIndex + 1),
      newBlock,
      ...value.slice(blockIndex + 1),
    ]
    caret = {
      blockKey: newBlock._key,
      offset: getTextBlock(newBlock).text.length,
    }

    return result
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
      return {patches: [], inversePatches: []}
    }

    const blockIndex = value.indexOf(block)
    const previousBlock = value[blockIndex - 1]
    const nextBlock = value[blockIndex + 1]
    const reinsert = previousBlock
      ? insert([block], 'after', [{_key: previousBlock._key}])
      : nextBlock
        ? insert([block], 'before', [{_key: nextBlock._key}])
        : insert([block], 'before', [0])
    const remainingValue = value.filter(
      (candidate) => candidate._key !== block._key,
    )

    if (remainingValue.length === 0) {
      setValue(undefined)

      return {
        patches: [unset([{_key: block._key}]), unset([])],
        inversePatches: [setIfMissing([], []), reinsert],
      }
    }

    if (caret.blockKey === block._key) {
      caret = previousBlock
        ? {
            blockKey: previousBlock._key,
            offset: getTextBlock(previousBlock).text.length,
          }
        : {blockKey: nextBlock._key, offset: 0}
    }

    value = remainingValue

    return {
      patches: [unset([{_key: block._key}])],
      inversePatches: [reinsert],
    }
  }

  return {
    getValue: () => value,
    getCaret: () => caret,
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
    putCaretAfter,
    insertBlock,
    deleteBlock,
  }
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
  const generatedKeys = new Set<string>()
  const keyGenerator = createRecordingKeyGenerator(generatedKeys)
  const parsed = fromTextspec({schema, keyGenerator}, expected)
  const namedKeys = new Set(
    parsed.blocks
      .map((block) => block._key)
      .filter((key) => !generatedKeys.has(key)),
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

function createRecordingKeyGenerator(generatedKeys: Set<string>) {
  let index = 0

  return function keyGenerator() {
    const key = `expected-k${index}`
    index++
    generatedKeys.add(key)
    return key
  }
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
