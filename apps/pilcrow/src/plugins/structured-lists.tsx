import {
  defineContainer,
  useEditor,
  type BlockPath,
  type EditorSnapshot,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin, ContainerPlugin} from '@portabletext/editor/plugins'
import {getFocusTextBlock, getNextBlock} from '@portabletext/editor/selectors'
import {getAncestor, getSibling} from '@portabletext/editor/traversal'
import {getBlockEndPoint} from '@portabletext/editor/utils'
import type {
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {createContext, useContext} from 'react'

/**
 * Structured lists: `list` and `list-item` as nested containers.
 *
 * A list has a `kind` field (bullet / number / task) and an `items`
 * array of list-items. Each list-item has a `content` array that
 * can hold plain text blocks AND nested lists - that is how nesting
 * works structurally rather than through a `level` field on flat
 * blocks.
 *
 * Tab sinks the focus item one level deeper. Shift+Tab lifts it one
 * level out, bringing trailing siblings along as a nested list to
 * preserve document order.
 *
 * Ported from `packages/editor/gherkin-tests/plugin.structured-lists`
 * (PR #2635).
 */

// ---------------------------------------------------------------------------
// Domain shape
// ---------------------------------------------------------------------------

type Keyed = {_key: string}
type Path = BlockPath

type ListNode = Keyed & {
  _type: 'list'
  kind?: string
  items: Array<ListItemNode>
}

type ListItemNode = Keyed & {
  _type: 'list-item'
  checked?: boolean
  content: Array<unknown>
}

function isKeyedSegment(segment: unknown): segment is Keyed {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    '_key' in (segment as Record<string, unknown>)
  )
}

const isList = (node: unknown): node is ListNode =>
  (node as {_type?: unknown})?._type === 'list'

const isListItem = (node: unknown): node is ListItemNode =>
  (node as {_type?: unknown})?._type === 'list-item'

// ---------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------

const ListKindContext = createContext<string>('bullet')

function ListContainerRender(props: {
  attributes: Record<string, unknown>
  children: React.ReactElement
  node: unknown
}) {
  const list = props.node as ListNode
  const kind = list.kind ?? 'bullet'
  const Tag = kind === 'number' ? 'ol' : 'ul'
  return (
    <ListKindContext.Provider value={kind}>
      <Tag {...props.attributes} className={`pc-list pc-list-${kind}`}>
        {props.children}
      </Tag>
    </ListKindContext.Provider>
  )
}

const listContainer = defineContainer({
  type: 'list',
  childField: 'items',
  render: ({attributes, children, node}) => (
    <ListContainerRender attributes={attributes} node={node}>
      {children}
    </ListContainerRender>
  ),
  of: [
    defineContainer({
      type: 'list-item',
      childField: 'content',
      render: ({attributes, children, node, path}) => (
        <ListItemContainerRender
          attributes={attributes}
          node={node}
          path={path as Path}
        >
          {children}
        </ListItemContainerRender>
      ),
    }),
  ],
})

function ListItemContainerRender(props: {
  attributes: Record<string, unknown>
  children: React.ReactElement
  node: unknown
  path: Path
}) {
  const kind = useContext(ListKindContext)
  const editor = useEditor()
  const item = props.node as ListItemNode
  const checked = item.checked === true
  // A list-item that holds ONLY nested lists (no text block of its own) is
  // a structural wrapper produced by sinking the first item of a task list
  // - it has no task text to check off, so its checkbox would be a phantom
  // affordance toggling a `checked` field on a node the user never sees.
  // Skip the checkbox in that case.
  const hasOwnText = item.content.some(
    (child) =>
      typeof child === 'object' &&
      child !== null &&
      (child as {_type?: string})._type === 'block',
  )
  if (kind === 'task' && hasOwnText) {
    return (
      <li
        {...props.attributes}
        className={`pc-list-item pc-list-item-task${checked ? ' pc-list-item-task-done' : ''}`}
      >
        <input
          type="checkbox"
          className="pc-task-check"
          checked={checked}
          aria-label="Task done"
          contentEditable={false}
          onMouseDown={(event) => event.preventDefault()}
          onChange={() => {
            editor.send({
              type: 'set',
              at: [...props.path, 'checked'] as never,
              value: !checked,
            })
          }}
        />
        <span className="pc-task-body">{props.children}</span>
      </li>
    )
  }
  return (
    <li {...props.attributes} className="pc-list-item">
      {props.children}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const childPath = (parent: Path, field: string, child: Keyed): Path => [
  ...parent,
  field,
  {_key: child._key},
]

const newList = (
  keyGen: () => string,
  kind: string | undefined,
  items: Array<ListItemNode>,
): ListNode => ({
  _type: 'list',
  _key: keyGen(),
  ...(kind !== undefined ? {kind} : {}),
  items,
})

const newListItem = (
  keyGen: () => string,
  content: Array<unknown>,
): ListItemNode => ({
  _type: 'list-item',
  _key: keyGen(),
  content,
})

function rebaseFocus(
  focusPath: Path,
  oldKey: string,
  newPrefix: Path,
): Path | undefined {
  const idx = focusPath.findIndex(
    (seg) => isKeyedSegment(seg) && seg._key === oldKey,
  )
  if (idx < 0) {
    return undefined
  }
  return [...newPrefix, ...focusPath.slice(idx + 1)]
}

type Snapshot = EditorSnapshot

export function getEnclosingList(snapshot: Snapshot) {
  return resolveFocus(snapshot)
}

function resolveFocus(snapshot: Snapshot) {
  const focusPath = snapshot.context.selection?.focus.path
  if (!focusPath) {
    return undefined
  }
  const listItem = getAncestor(snapshot, focusPath as never, isListItem) as
    | {node: ListItemNode; path: Path}
    | undefined
  if (!listItem) {
    return undefined
  }
  const list = getAncestor(snapshot, listItem.path, isList) as
    | {node: ListNode; path: Path}
    | undefined
  if (!list) {
    return undefined
  }
  const itemIndex = list.node.items.findIndex(
    (item) => item._key === listItem.node._key,
  )
  if (itemIndex < 0) {
    return undefined
  }
  return {listItem, list, itemIndex}
}

function selectAt(snapshot: Snapshot, path: Path | undefined) {
  if (!path) {
    return undefined
  }
  const offset = snapshot.context.selection?.focus.offset ?? 0
  return raise({
    type: 'select' as const,
    at: {anchor: {path, offset}, focus: {path, offset}} as never,
  })
}

type Raise = ReturnType<typeof raise>

// ---------------------------------------------------------------------------
// Sink / lift behaviors
// ---------------------------------------------------------------------------

function isTabEvent(originEvent: KeyboardEvent | undefined): boolean {
  if (!originEvent) {
    return false
  }
  return (
    originEvent.key === 'Tab' &&
    !originEvent.shiftKey &&
    !originEvent.metaKey &&
    !originEvent.ctrlKey &&
    !originEvent.altKey
  )
}

function isShiftTabEvent(originEvent: KeyboardEvent | undefined): boolean {
  if (!originEvent) {
    return false
  }
  return (
    originEvent.key === 'Tab' &&
    originEvent.shiftKey &&
    !originEvent.metaKey &&
    !originEvent.ctrlKey &&
    !originEvent.altKey
  )
}

function computeSinkRaises(snapshot: Snapshot): Array<Raise> | null {
  const focus = resolveFocus(snapshot)
  if (!focus) {
    return null
  }
  const focusPath = snapshot.context.selection?.focus.path as Path | undefined
  if (!focusPath) {
    return null
  }
  const {listItem, list, itemIndex} = focus
  const keyGen = snapshot.context.keyGenerator
  const sourceKind = list.node.kind
  const raises: Array<Raise> = []

  if (itemIndex === 0) {
    const wrapperList = newList(keyGen, sourceKind, [listItem.node])
    const wrapper = newListItem(keyGen, [wrapperList])
    raises.push(
      raise({type: 'unset', at: listItem.path}),
      raise({
        type: 'insert',
        at: [...list.path, 'items', 0] as never,
        value: wrapper as never,
        position: 'before',
      }),
    )
    const select = selectAt(
      snapshot,
      rebaseFocus(focusPath, listItem.node._key, [
        ...childPath(list.path, 'items', wrapper),
        ...childPath([], 'content', wrapperList),
        'items',
        {_key: listItem.node._key},
      ]),
    )
    if (select) {
      raises.push(select)
    }
    return raises
  }

  const prevSibling = getSibling(snapshot, listItem.path, 'previous') as
    | {node: unknown; path: Path}
    | undefined
  if (!prevSibling || !isListItem(prevSibling.node)) {
    return null
  }
  const prevContent = (prevSibling.node as ListItemNode).content
  const trailing = prevContent[prevContent.length - 1]

  if (trailing && isList(trailing)) {
    const trailingListPath = childPath(prevSibling.path, 'content', trailing)
    const lastItem = trailing.items[trailing.items.length - 1] as ListItemNode
    raises.push(
      raise({type: 'unset', at: listItem.path}),
      raise({
        type: 'insert',
        at: childPath(trailingListPath, 'items', lastItem) as never,
        value: listItem.node as never,
        position: 'after',
      }),
    )
    const select = selectAt(
      snapshot,
      rebaseFocus(focusPath, listItem.node._key, [
        ...trailingListPath,
        'items',
        {_key: listItem.node._key},
      ]),
    )
    if (select) {
      raises.push(select)
    }
    return raises
  }

  const fresh = newList(keyGen, sourceKind, [listItem.node])
  const hasContent = prevContent.length > 0
  raises.push(
    raise({type: 'unset', at: listItem.path}),
    raise({
      type: 'insert',
      at: (hasContent
        ? childPath(
            prevSibling.path,
            'content',
            prevContent[prevContent.length - 1] as Keyed,
          )
        : [...prevSibling.path, 'content', 0]) as never,
      value: fresh as never,
      position: hasContent ? 'after' : 'before',
    }),
  )
  const select = selectAt(
    snapshot,
    rebaseFocus(focusPath, listItem.node._key, [
      ...childPath(prevSibling.path, 'content', fresh),
      'items',
      {_key: listItem.node._key},
    ]),
  )
  if (select) {
    raises.push(select)
  }
  return raises
}

/**
 * Wires a compute-raises function to one keyboard-event trigger plus
 * one custom-event trigger. Both behaviors share the same plan
 * (\`{raises}\`) and the same dispatch action. Avoids hand-duplicating
 * the same guard/action twice.
 */
function defineSinkLiftPair({
  customType,
  isKeyboardMatch,
  compute,
}: {
  customType:
    | 'custom.structured-lists.indent'
    | 'custom.structured-lists.outdent'
  isKeyboardMatch: (event: KeyboardEvent | undefined) => boolean
  compute: (snapshot: Snapshot) => Array<Raise> | null
}) {
  const dispatch = (planned: unknown) =>
    (planned as {raises: Array<Raise>}).raises
  return [
    defineBehavior({
      on: 'keyboard.keydown',
      guard: ({snapshot, event}) => {
        if (!isKeyboardMatch(event.originEvent as KeyboardEvent | undefined)) {
          return false
        }
        const raises = compute(snapshot as never)
        return raises ? {raises} : false
      },
      actions: [(_, planned) => dispatch(planned)],
    }),
    defineBehavior({
      on: customType,
      guard: ({snapshot}) => {
        const raises = compute(snapshot as never)
        return raises ? {raises} : false
      },
      actions: [(_, planned) => dispatch(planned)],
    }),
  ]
}

const [sinkOnTab, sinkOnCustom] = defineSinkLiftPair({
  customType: 'custom.structured-lists.indent',
  isKeyboardMatch: isTabEvent,
  compute: computeSinkRaises,
})

function computeLiftRaises(snapshot: Snapshot): Array<Raise> | null {
  const focus = resolveFocus(snapshot)
  if (!focus) {
    return null
  }
  const focusPath = snapshot.context.selection?.focus.path as Path | undefined
  if (!focusPath) {
    return null
  }
  const {listItem, list, itemIndex} = focus
  const keyGen = snapshot.context.keyGenerator

  const parentListItem = getAncestor(snapshot, list.path, isListItem) as
    | {node: ListItemNode; path: Path}
    | undefined
  if (!parentListItem) {
    return null
  }
  const parentList = getAncestor(snapshot, parentListItem.path, isList) as
    | {node: ListNode; path: Path}
    | undefined
  if (!parentList) {
    return null
  }

  const itemsAfter = list.node.items.slice(itemIndex + 1)
  const isFirstItem = itemIndex === 0
  const sourceKind = list.node.kind

  const liftedItem: ListItemNode =
    itemsAfter.length > 0
      ? {
          ...listItem.node,
          content: [
            ...listItem.node.content,
            newList(keyGen, sourceKind, itemsAfter),
          ],
        }
      : listItem.node

  const raises: Array<Raise> = [
    raise({
      type: 'insert',
      at: childPath(parentList.path, 'items', parentListItem.node) as never,
      value: liftedItem as never,
      position: 'after',
    }),
  ]

  if (isFirstItem) {
    raises.push(raise({type: 'unset', at: list.path}))
    if (parentListItem.node.content.length === 1) {
      raises.push(raise({type: 'unset', at: parentListItem.path}))
    }
  } else {
    raises.push(raise({type: 'unset', at: listItem.path}))
    for (const item of itemsAfter) {
      raises.push(
        raise({
          type: 'unset',
          at: childPath(list.path, 'items', item) as never,
        }),
      )
    }
  }

  const select = selectAt(
    snapshot,
    rebaseFocus(
      focusPath,
      listItem.node._key,
      childPath(parentList.path, 'items', listItem.node),
    ),
  )
  if (select) {
    raises.push(select)
  }

  return raises
}

const [liftOnShiftTab, liftOnCustom] = defineSinkLiftPair({
  customType: 'custom.structured-lists.outdent',
  isKeyboardMatch: isShiftTabEvent,
  compute: computeLiftRaises,
})

// ---------------------------------------------------------------------------
// Split on Enter
// ---------------------------------------------------------------------------

/**
 * Pressing Enter inside a list-item's text block splits the list-item:
 * text before the cursor stays in the current item, text after the
 * cursor moves into a new sibling list-item. Empty trailing text
 * blocks at the end of the source list-item move along too.
 *
 * If the focus block isn't a direct text-block child of a list-item,
 * this behavior bails and the default insert.break handler runs.
 */
const splitListItemOnEnter = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const selection = snapshot.context.selection
    if (!selection) {
      return false
    }
    // Only handle collapsed selection (single caret).
    const {focus, anchor} = selection
    if (
      focus.path.length !== anchor.path.length ||
      focus.offset !== anchor.offset
    ) {
      const sameKeys = focus.path.every((seg, i) => {
        const other = anchor.path[i]
        if (typeof seg === 'string' || typeof other === 'string') {
          return seg === other
        }
        if (typeof seg === 'number' || typeof other === 'number') {
          return seg === other
        }
        return (seg as {_key: string})._key === (other as {_key: string})._key
      })
      if (!sameKeys) {
        return false
      }
    }
    const enclosingItem = getAncestor(
      snapshot,
      focus.path as never,
      isListItem,
    ) as {node: ListItemNode; path: Path} | undefined
    if (!enclosingItem) {
      return false
    }
    // The focus text block must be a direct content child of the list-item.
    // focus.path looks like:
    //   [..., {_key: itemKey}, 'content', {_key: textBlockKey}, 'children', {_key: spanKey}]
    // We need to find the text block segment immediately under the item's 'content'.
    const itemPathLength = enclosingItem.path.length
    // Path after item: 'content', {_key: blockKey}, 'children', {_key: spanKey}
    if (focus.path.length < itemPathLength + 4) {
      return false
    }
    if (focus.path[itemPathLength] !== 'content') {
      return false
    }
    const blockSeg = focus.path[itemPathLength + 1]
    if (typeof blockSeg !== 'object' || blockSeg === null) {
      return false
    }
    const blockKey = (blockSeg as {_key: string})._key
    // Find the block in content - must be a text block we can split.
    const blockIndex = enclosingItem.node.content.findIndex(
      (entry) =>
        (entry as {_key?: string})._key === blockKey &&
        (entry as {_type?: string})._type === 'block',
    )
    if (blockIndex < 0) {
      return false
    }
    const block = enclosingItem.node.content[
      blockIndex
    ] as PortableTextTextBlock
    return {
      enclosingItem,
      blockIndex,
      block,
      focusPath: focus.path,
      focusOffset: focus.offset,
    }
  },
  actions: [
    (
      {snapshot},
      {enclosingItem, blockIndex, block, focusPath, focusOffset},
    ) => {
      const keyGen = snapshot.context.keyGenerator
      // Compute what's AFTER the cursor in the focused text block. That
      // text + any trailing content entries in the list-item move into
      // a new sibling list-item.
      const spanSeg = focusPath[focusPath.length - 1]
      const focusSpanKey =
        typeof spanSeg === 'object' && spanSeg !== null
          ? (spanSeg as {_key: string})._key
          : undefined
      const afterSpans: Array<PortableTextSpan> = []
      let pastFocusSpan = false
      for (const child of block.children) {
        const span = child as PortableTextSpan
        if (pastFocusSpan) {
          afterSpans.push(span)
          continue
        }
        if (span._key === focusSpanKey) {
          const text = span.text ?? ''
          afterSpans.push({
            ...span,
            _key: keyGen(),
            text: text.slice(focusOffset),
          })
          pastFocusSpan = true
        }
      }
      if (!pastFocusSpan) {
        return []
      }
      const trailingContent = enclosingItem.node.content.slice(blockIndex + 1)
      const newBlock: PortableTextTextBlock = {
        ...block,
        _key: keyGen(),
        children:
          afterSpans.length > 0
            ? afterSpans
            : [
                {
                  _type: 'span',
                  _key: keyGen(),
                  text: '',
                  marks: [],
                },
              ],
      }
      const newItem: ListItemNode = {
        _type: 'list-item',
        _key: keyGen(),
        content: [newBlock, ...trailingContent] as Array<unknown>,
      }
      const newItemPath: Path = [
        ...enclosingItem.path.slice(0, -1),
        {_key: newItem._key},
      ]
      const newSpanPath: Path = [
        ...newItemPath,
        'content',
        {_key: newBlock._key},
        'children',
        {_key: (newBlock.children[0] as PortableTextSpan)._key},
      ]
      // Find the END of the focused text block: path to its last span,
      // offset = length of that span's text.
      const lastSpan = block.children[
        block.children.length - 1
      ] as PortableTextSpan
      const blockPath: Path = [
        ...enclosingItem.path,
        'content',
        {_key: block._key},
      ]
      const blockEndPath: Path = [
        ...blockPath,
        'children',
        {_key: lastSpan._key},
      ]
      const blockEndOffset = (lastSpan.text ?? '').length
      const raises: Array<Raise> = []
      // 1. Delete the text from cursor to end of the focused text block.
      raises.push(
        raise({
          type: 'delete',
          at: {
            anchor: {path: focusPath, offset: focusOffset},
            focus: {path: blockEndPath, offset: blockEndOffset},
          } as never,
        }),
      )
      // 2. Unset the trailing content entries in the source list-item;
      //    they're moving into the new item.
      for (const entry of trailingContent) {
        const entryKey = (entry as {_key?: string})._key
        if (!entryKey) {
          continue
        }
        raises.push(
          raise({
            type: 'unset',
            at: [...enclosingItem.path, 'content', {_key: entryKey}] as never,
          }),
        )
      }
      // 3. Insert the new list-item as a sibling AFTER the current one.
      raises.push(
        raise({
          type: 'insert',
          at: enclosingItem.path,
          value: newItem as never,
          position: 'after',
        }),
      )
      // 4. Move the caret to the start of the new text block.
      raises.push(
        raise({
          type: 'select',
          at: {
            anchor: {path: newSpanPath, offset: 0},
            focus: {path: newSpanPath, offset: 0},
          } as never,
        }),
      )
      return raises
    },
  ],
})

// ---------------------------------------------------------------------------
// Merge list-items on Backspace / Delete across container boundaries
// ---------------------------------------------------------------------------

/**
 * Helper: is the collapsed caret at the start of the given text block.
 * Inlined from \`@portabletext/editor/utils/util.at-the-beginning-of-block\`
 * because that helper isn't part of the package's public exports.
 */
/**
 * Walks the FIRST content entry of a list-item, descending into nested
 * lists' first list-item, to find the visually-leading text block.
 * Symmetric to {@link findDeepestTrailingTextBlock} and used by the
 * Delete-merge to find where to splice the next list-item's content
 * when its first entry is a nested list rather than a text block.
 */
function findDeepestLeadingTextBlock(
  item: ListItemNode,
  itemPath: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const content = item.content
  for (const entry of content) {
    const node = entry as {_type?: string; _key?: string} | undefined
    if (!node || !node._key) {
      continue
    }
    const entryPath: Path = [...itemPath, 'content', {_key: node._key}]
    if (node._type === 'block') {
      return {node: node as never as PortableTextTextBlock, path: entryPath}
    }
    if (node._type === 'list') {
      const list = node as never as ListNode
      const items = list.items ?? []
      const firstItem = items[0]
      if (firstItem) {
        const nested = findDeepestLeadingTextBlock(firstItem, [
          ...entryPath,
          'items',
          {_key: firstItem._key},
        ])
        if (nested) {
          return nested
        }
      }
    }
    // Skip non-block, non-list entries; they're not valid merge targets.
  }
  return undefined
}

function findDeepestTrailingTextBlock(
  item: ListItemNode,
  itemPath: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const content = item.content
  for (let i = content.length - 1; i >= 0; i--) {
    const entry = content[i] as {_type?: string; _key?: string} | undefined
    if (!entry || !entry._key) {
      continue
    }
    const entryPath: Path = [...itemPath, 'content', {_key: entry._key}]
    if (entry._type === 'block') {
      return {node: entry as never as PortableTextTextBlock, path: entryPath}
    }
    if (entry._type === 'list') {
      const list = entry as never as ListNode
      const items = list.items ?? []
      // Walk the last list-item of the trailing list.
      const lastItem = items[items.length - 1]
      if (lastItem) {
        const nested = findDeepestTrailingTextBlock(lastItem, [
          ...entryPath,
          'items',
          {_key: lastItem._key},
        ])
        if (nested) {
          return nested
        }
      }
    }
    // Skip non-block, non-list entries (images, code-blocks) - they're not
    // valid merge targets.
  }
  return undefined
}

function isAtBlockStart(
  snapshot: import('@portabletext/editor').EditorSnapshot,
  block: {_key: string; children: ReadonlyArray<{_key?: string}>},
): boolean {
  const selection = snapshot.context.selection
  if (!selection) {
    return false
  }
  if (
    selection.anchor.path.length !== selection.focus.path.length ||
    selection.anchor.offset !== selection.focus.offset
  ) {
    return false
  }
  const focusPath = selection.focus.path
  const lastSeg = focusPath[focusPath.length - 1]
  if (typeof lastSeg !== 'object' || lastSeg === null) {
    return false
  }
  const focusSpanKey = (lastSeg as {_key: string})._key
  return (
    focusSpanKey === block.children[0]?._key && selection.focus.offset === 0
  )
}

/**
 * Backspace at the start of a list-item's first text block, when the
 * focus text block has no previous sibling at the same level, merges
 * the current list-item INTO the previous sibling list-item. The
 * current item's first text block lands at the end of the previous
 * item's last text block (slate merges the spans). Any extra content
 * the current item carries (nested lists, images, etc.) is left
 * alone for now - the common single-text-block case is what most
 * users hit.
 */
const mergeListItemOnBackspace = defineBehavior({
  on: 'delete.backward',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)
    if (!focusTextBlock) {
      return false
    }
    if (!isAtBlockStart(snapshot, focusTextBlock.node)) {
      return false
    }
    const enclosingItem = getAncestor(
      snapshot,
      focusTextBlock.path,
      isListItem,
    ) as {node: ListItemNode; path: Path} | undefined
    if (!enclosingItem) {
      return false
    }
    // Only handle the case where this text block is the FIRST content
    // entry of its list-item - otherwise the default behavior merges
    // sibling text blocks within the same item, which is correct.
    const firstContent = enclosingItem.node.content[0] as
      | {_key?: string}
      | undefined
    if (!firstContent || firstContent._key !== focusTextBlock.node._key) {
      return false
    }
    const previousItem = getSibling(
      snapshot,
      enclosingItem.path,
      'previous',
    ) as {node: unknown; path: Path} | undefined
    if (!previousItem || !isListItem(previousItem.node)) {
      return false
    }
    // Walk the previous item's content depth-first, following the LAST
    // content entry at each step (and if it's a list, then its LAST list-
    // item) to find the visually-trailing text block. That's the natural
    // join target for the merge.
    const trailing = findDeepestTrailingTextBlock(
      previousItem.node as ListItemNode,
      previousItem.path,
    )
    if (!trailing) {
      return false
    }
    const previousLastBlock = {
      node: trailing.node as never,
      path: trailing.path as never,
    }
    const previousEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: previousLastBlock,
    })
    return {focusTextBlock, previousEndPoint, enclosingItem}
  },
  actions: [
    (_, {focusTextBlock, previousEndPoint, enclosingItem}) => {
      // Walk each child of the focus block and raise an `insert.child`
      // event so spans-with-marks (e.g. \`strong\`, \`em\`) survive the
      // merge - `insert.text` would have inserted plain text and dropped
      // any decorators. Inline objects flow through the same path.
      const children = focusTextBlock.node.children as Array<unknown>
      const inserts: Array<ReturnType<typeof raise>> = children.map((child) =>
        raise({
          type: 'insert.child',
          child: child as Parameters<typeof raise>[0] extends infer T
            ? T extends {type: 'insert.child'; child: infer C}
              ? C
              : never
            : never,
        } as never),
      )
      return [
        // Move the caret to the join point first.
        raise({
          type: 'select',
          at: {
            anchor: previousEndPoint,
            focus: previousEndPoint,
          },
        }),
        // Insert each child of the focus block at the join point. Marks
        // come along because the whole span (with its mark refs) is
        // copied across.
        ...inserts,
        // Put the caret back at the join point so users land where the
        // merge happened, not at the end of the appended children.
        raise({
          type: 'select',
          at: {
            anchor: previousEndPoint,
            focus: previousEndPoint,
          },
        }),
        raise({
          type: 'unset',
          at: enclosingItem.path,
        }),
      ]
    },
  ],
})

/**
 * Delete at the end of a list-item's last text block, when no next
 * sibling block exists at the same level, merges the NEXT sibling
 * list-item's first text block INTO the current one. Symmetric to
 * Backspace.
 */
const mergeListItemOnDelete = defineBehavior({
  on: 'delete.forward',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)
    if (!focusTextBlock) {
      return false
    }
    const focusPath = snapshot.context.selection?.focus.path as Path | undefined
    if (!focusPath) {
      return false
    }
    // Verify caret is at the end of the focus text block.
    const blockEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: focusTextBlock,
    })
    const focusOffset = snapshot.context.selection?.focus.offset ?? 0
    const endSeg = blockEndPoint.path[blockEndPoint.path.length - 1]
    const focusSeg = focusPath[focusPath.length - 1]
    if (
      typeof endSeg !== 'object' ||
      typeof focusSeg !== 'object' ||
      endSeg === null ||
      focusSeg === null
    ) {
      return false
    }
    if ((endSeg as {_key: string})._key !== (focusSeg as {_key: string})._key) {
      return false
    }
    if (focusOffset !== blockEndPoint.offset) {
      return false
    }
    // Bail if there's a next sibling text block - the default handles it.
    const nextSibling = getNextBlock(snapshot)
    if (nextSibling) {
      return false
    }
    const enclosingItem = getAncestor(
      snapshot,
      focusTextBlock.path,
      isListItem,
    ) as {node: ListItemNode; path: Path} | undefined
    if (!enclosingItem) {
      return false
    }
    // Focus text block must be the LAST content entry of its list-item.
    const itemContent = enclosingItem.node.content
    const lastContent = itemContent[itemContent.length - 1] as
      | {_key?: string}
      | undefined
    if (!lastContent || lastContent._key !== focusTextBlock.node._key) {
      return false
    }
    const nextItem = getSibling(snapshot, enclosingItem.path, 'next') as
      | {node: unknown; path: Path}
      | undefined
    if (!nextItem || !isListItem(nextItem.node)) {
      return false
    }
    const nextItemNode = nextItem.node as ListItemNode
    // Walk the next item's content depth-first, following the FIRST
    // content entry at each step (and if it's a list, then its FIRST
    // list-item) to find the visually-leading text block. That's the
    // natural source for the merge.
    const leading = findDeepestLeadingTextBlock(nextItemNode, nextItem.path)
    if (!leading) {
      return false
    }
    return {focusTextBlock, leading, nextItem}
  },
  actions: [
    (_, {focusTextBlock, leading, nextItem}) => {
      // Same shape as the Backspace merge: walk each child of the
      // leading text block and raise an `insert.child` event so spans
      // with marks survive. `insert.text` would have lost them.
      const children = leading.node.children as Array<unknown>
      const inserts: Array<ReturnType<typeof raise>> = []
      const focusEndPath = focusTextBlock.path
      // Caret must be at end of focus block (the guard ensured that);
      // raising `insert.child` repeatedly appends after the caret.
      for (const child of children) {
        inserts.push(
          raise({
            type: 'insert.child',
            child: child as never,
          } as never),
        )
      }
      return [
        ...inserts,
        // Put the caret back where the merge joined (just before the
        // newly-inserted content).
        raise({
          type: 'select',
          at: {
            anchor: {path: focusEndPath, offset: 0},
            focus: {path: focusEndPath, offset: 0},
          } as never,
        }),
        // The leading text block has been folded into focus; remove the
        // entire enclosing next list-item. Nested lists inside it (if
        // any) come along with the unset, which is the right behavior:
        // the user's intent is "join the next list-item into me".
        raise({
          type: 'unset',
          at: nextItem.path,
        }),
      ]
    },
  ],
})

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Wraps the focus text block in a fresh \`list\` container of the given
 * kind. Caret stays inside the wrapped block. Used by the toolbar's
 * list-toggle buttons when the caret isn't already inside a list.
 */
const wrapInListOnCustom = defineBehavior({
  on: 'custom.structured-lists.wrap',
  guard: ({snapshot, event}) => {
    const focusPath = snapshot.context.selection?.focus.path as Path | undefined
    if (!focusPath) {
      return false
    }
    const focusTextBlock = getFocusTextBlock(snapshot)
    if (!focusTextBlock) {
      return false
    }
    // If already inside a list, do nothing (toolbar handles kind-change separately).
    if (resolveFocus(snapshot as never)) {
      return false
    }
    const kind = (event as {kind?: string}).kind ?? 'bullet'
    const keyGen = snapshot.context.keyGenerator
    const itemKey = keyGen()
    const listKey = keyGen()
    const list = {
      _type: 'list',
      _key: listKey,
      kind,
      items: [
        {
          _type: 'list-item',
          _key: itemKey,
          content: [focusTextBlock.node],
        },
      ],
    }
    const blockKey = (focusTextBlock.node as {_key: string})._key
    const blockIndex = focusPath.findIndex(
      (seg) => typeof seg === 'object' && (seg as Keyed)._key === blockKey,
    )
    if (blockIndex < 0) {
      return false
    }
    const prefix = focusPath.slice(0, blockIndex)
    const suffix = focusPath.slice(blockIndex + 1)
    const newPath = [
      ...prefix,
      {_key: listKey},
      'items',
      {_key: itemKey},
      'content',
      {_key: blockKey},
      ...suffix,
    ]
    return {
      list,
      newPath,
      focusOffset: snapshot.context.selection?.focus.offset ?? 0,
      focusBlockPath: focusTextBlock.path,
    }
  },
  actions: [
    (_, planned) => {
      const p = planned as {
        list: unknown
        focusBlockPath: Path
        newPath: Path
        focusOffset: number
      }
      return [
        raise({
          type: 'insert',
          at: p.focusBlockPath as never,
          value: p.list as never,
          position: 'before',
        }),
        raise({type: 'unset', at: p.focusBlockPath as never}),
        raise({
          type: 'select',
          at: {
            anchor: {path: p.newPath as never, offset: p.focusOffset},
            focus: {path: p.newPath as never, offset: p.focusOffset},
          } as never,
        }),
      ]
    },
  ],
})

/**
 * Unwraps the focus list-item's content out of its enclosing list. If the
 * list has more siblings, only the focus item is unwrapped; the remaining
 * items stay in the list. If the focus item was the last one, the list
 * itself is removed. Used by the toolbar's list-toggle buttons when the
 * caret is already inside a list of the same kind (toggle off).
 */
const unwrapFromListOnCustom = defineBehavior({
  on: 'custom.structured-lists.unwrap',
  guard: ({snapshot}) => {
    const focus = resolveFocus(snapshot as never)
    if (!focus) {
      return false
    }
    const focusPath = snapshot.context.selection?.focus.path as Path | undefined
    if (!focusPath) {
      return false
    }
    const focusOffset = snapshot.context.selection?.focus.offset ?? 0
    const focusBlockKeySegment = focusPath.find(
      (seg, idx) =>
        idx > 0 && typeof seg === 'object' && focusPath[idx - 1] === 'content',
    )
    const focusBlockKey = focusBlockKeySegment
      ? (focusBlockKeySegment as Keyed)._key
      : null
    if (!focusBlockKey) {
      return false
    }
    // Inserting list-item's content blocks as siblings of the enclosing
    // list, in order, then removing the list-item from the list.
    const {listItem, list, itemIndex} = focus
    const items = list.node.items
    const onlyChild = items.length === 1
    return {
      focus,
      focusPath,
      focusOffset,
      focusBlockKey,
      onlyChild,
      itemIndex,
      listItem,
      list,
    }
  },
  actions: [
    (_, planned) => {
      const p = planned as {
        focus: {
          listItem: {node: ListItemNode; path: Path}
          list: {node: ListNode; path: Path}
          itemIndex: number
        }
        focusPath: Path
        focusOffset: number
        focusBlockKey: string
        onlyChild: boolean
        listItem: {node: ListItemNode; path: Path}
        list: {node: ListNode; path: Path}
      }
      const blocks = p.listItem.node.content
      const raises: Array<Raise> = []
      // Insert each content block as a sibling BEFORE the list, in order.
      for (let i = 0; i < blocks.length; i++) {
        raises.push(
          raise({
            type: 'insert',
            at: p.list.path as never,
            value: blocks[i] as never,
            position: 'before',
          }),
        )
      }
      // Remove the focus list-item from the list.
      raises.push(raise({type: 'unset', at: p.listItem.path as never}))
      // If list ends up empty, remove it too.
      if (p.onlyChild) {
        raises.push(raise({type: 'unset', at: p.list.path as never}))
      }
      // Re-establish caret at the (now unwrapped) original block.
      const parentOfList = p.list.path.slice(0, -1)
      const newFocusPath = [
        ...parentOfList,
        {_key: p.focusBlockKey},
        'children',
        ...p.focusPath.slice(p.focusPath.indexOf('children') + 1),
      ]
      raises.push(
        raise({
          type: 'select',
          at: {
            anchor: {path: newFocusPath as never, offset: p.focusOffset},
            focus: {path: newFocusPath as never, offset: p.focusOffset},
          } as never,
        }),
      )
      return raises
    },
  ],
})

export function StructuredListsPlugin() {
  return (
    <>
      <ContainerPlugin containers={[listContainer]} />
      <BehaviorPlugin
        behaviors={[
          sinkOnTab,
          liftOnShiftTab,
          sinkOnCustom,
          liftOnCustom,
          wrapInListOnCustom,
          unwrapFromListOnCustom,
          splitListItemOnEnter,
          mergeListItemOnBackspace,
          mergeListItemOnDelete,
        ]}
      />
    </>
  )
}
