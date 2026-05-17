import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import {useEffect} from 'react'
import {useEditor} from '../src'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {defaultKeyboardShortcuts} from '../src/editor/default-keyboard-shortcuts'
import type {EditorSnapshot} from '../src/editor/editor-snapshot'
import {getAncestor} from '../src/node-traversal/get-ancestor'
import {getSibling} from '../src/node-traversal/get-sibling'
import {defineContainer} from '../src/renderers/renderer.types'
import type {Node} from '../src/slate/interfaces/node'
import type {Path} from '../src/slate/interfaces/path'
import {parameterTypes} from '../src/test'
import {createTestEditor, stepDefinitions} from '../src/test/vitest'
import type {Context} from '../src/test/vitest/step-context'
import pluginStructuredListsFeature from './plugin.structured-lists.feature?raw'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  blockObjects: [
    {name: 'image', fields: [{name: 'src', type: 'string'}]},
    {
      name: 'code-block',
      fields: [
        {name: 'language', type: 'string'},
        {name: 'lines', type: 'array', of: [{type: 'block'}]},
      ],
    },
    {
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {type: 'block'},
                    {type: 'list'},
                    {type: 'image'},
                    {type: 'code-block'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const listContainer = defineContainer({
  type: 'list',
  arrayField: 'items',
  render: ({attributes, children}) => (
    <ul data-testid="list" {...attributes}>
      {children}
    </ul>
  ),
})

const listItemContainer = defineContainer({
  type: 'list-item',
  arrayField: 'content',
  render: ({attributes, children}) => (
    <li data-testid="list-item" {...attributes}>
      {children}
    </li>
  ),
})

const codeBlockContainer = defineContainer({
  type: 'code-block',
  arrayField: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

// ---------------------------------------------------------------------------
// Domain shape + helpers
// ---------------------------------------------------------------------------

type Keyed = {_key: string}
type ListNode = Keyed & {
  _type: 'list'
  kind?: string
  items: Array<ListItemNode>
}
type ListItemNode = Keyed & {_type: 'list-item'; content: Array<Node>}

const isList = (node: Node): node is ListNode =>
  (node as {_type?: unknown})._type === 'list'
const isListItem = (node: Node): node is ListItemNode =>
  (node as {_type?: unknown})._type === 'list-item'

/**
 * Build a path to a node inside an array field of a parent.
 */
const childPath = (
  parentPath: Path,
  arrayField: string,
  child: Keyed,
): Path => [...parentPath, arrayField, {_key: child._key}]

/**
 * Build a new `list` value.
 */
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

/**
 * Build a new `list-item` value with given content.
 */
const newListItem = (
  keyGen: () => string,
  content: Array<Node>,
): ListItemNode => ({
  _type: 'list-item',
  _key: keyGen(),
  content,
})

/**
 * Replace the prefix of `focusPath` up to and including the keyed segment for
 * `oldKey` with `newPrefix`. Used to follow a moved subtree.
 */
function rebaseFocus(
  focusPath: Path,
  oldKey: string,
  newPrefix: Path,
): Path | undefined {
  const idx = focusPath.findIndex(
    (segment) =>
      typeof segment === 'object' &&
      segment !== null &&
      '_key' in segment &&
      (segment as Keyed)._key === oldKey,
  )
  if (idx < 0) {
    return undefined
  }
  return [...newPrefix, ...focusPath.slice(idx + 1)]
}

/**
 * Resolve "the list-item the focus is inside" plus its enclosing list and
 * the item's index within the list. Returns `undefined` when the cursor
 * isn't inside a list-item.
 */
function resolveFocus(snapshot: EditorSnapshot) {
  const focusPath = snapshot.context.selection?.focus.path
  if (!focusPath) {
    return undefined
  }

  const listItem = getAncestor(snapshot, focusPath, isListItem)
  if (!listItem) {
    return undefined
  }

  const list = getAncestor(snapshot, listItem.path, isList)
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

/**
 * Build a `select` raise at a collapsed caret, preserving the snapshot's
 * focus offset. Returns `undefined` when the focus path can't be rebased.
 */
function selectAt(snapshot: EditorSnapshot, path: Path | undefined) {
  if (!path) {
    return undefined
  }
  const offset = snapshot.context.selection?.focus.offset ?? 0
  return raise({
    type: 'select' as const,
    at: {anchor: {path, offset}, focus: {path, offset}},
  })
}

type Raise = ReturnType<typeof raise>

// ---------------------------------------------------------------------------
// Behaviors
// ---------------------------------------------------------------------------

/**
 * Tab: sink the focus list-item one level deeper.
 *
 * - First item in its list: wrap the item in a fresh list inside a fresh
 *   parent list-item, replacing itself.
 * - Previous sibling's last child is a list: append the focus item to it
 *   (kind-agnostic - the destination list owns its kind).
 * - Otherwise: append a fresh list (source kind) holding the focus item to
 *   the previous sibling's content.
 */
const sinkOnTab = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!defaultKeyboardShortcuts.tab.guard(event.originEvent)) {
      return false
    }
    const focus = resolveFocus(snapshot)
    if (!focus) {
      return false
    }
    const focusPath = snapshot.context.selection?.focus.path
    if (!focusPath) {
      return false
    }

    const {listItem, list, itemIndex} = focus
    const keyGen = snapshot.context.keyGenerator
    const sourceKind = list.node.kind
    const raises: Array<Raise> = []

    if (itemIndex === 0) {
      // Wrap self in a fresh list inside a fresh parent list-item.
      const wrapperList = newList(keyGen, sourceKind, [listItem.node])
      const wrapper = newListItem(keyGen, [wrapperList])
      raises.push(
        raise({type: 'unset', at: listItem.path}),
        raise({
          type: 'insert',
          at: [...list.path, 'items', 0],
          value: wrapper,
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
      return {raises}
    }

    const prevSibling = getSibling(snapshot, listItem.path, 'previous')
    if (!prevSibling || !isListItem(prevSibling.node)) {
      return false
    }
    const prevContent = prevSibling.node.content
    const trailing = prevContent[prevContent.length - 1]

    if (trailing && isList(trailing)) {
      // Merge into the trailing list.
      const trailingListPath = childPath(prevSibling.path, 'content', trailing)
      const lastItem = trailing.items[trailing.items.length - 1]!
      raises.push(
        raise({type: 'unset', at: listItem.path}),
        raise({
          type: 'insert',
          at: childPath(trailingListPath, 'items', lastItem),
          value: listItem.node,
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
      return {raises}
    }

    // Wrap in a fresh list, append to prev sibling's content.
    const fresh = newList(keyGen, sourceKind, [listItem.node])
    const hasContent = prevContent.length > 0
    raises.push(
      raise({type: 'unset', at: listItem.path}),
      raise({
        type: 'insert',
        at: hasContent
          ? childPath(
              prevSibling.path,
              'content',
              prevContent[prevContent.length - 1] as Keyed,
            )
          : [...prevSibling.path, 'content', 0],
        value: fresh,
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
    return {raises}
  },
  actions: [(_, {raises}) => raises],
})

/**
 * Shift+Tab: lift the focus list-item one level out.
 *
 * - Promoted to be a sibling of its enclosing list-item.
 * - Trailing siblings in the original nested list come along as a nested list
 *   under the lifted item (preserves document order).
 * - Leading siblings stay in the original nested list. If it becomes empty,
 *   it's removed.
 * - If the enclosing list-item's only content was the original nested list,
 *   it's removed too.
 * - At the outermost list (no parent list-item), Shift+Tab is a no-op.
 */
const liftOnShiftTab = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!defaultKeyboardShortcuts.shiftTab.guard(event.originEvent)) {
      return false
    }
    const focus = resolveFocus(snapshot)
    if (!focus) {
      return false
    }
    const focusPath = snapshot.context.selection?.focus.path
    if (!focusPath) {
      return false
    }

    const {listItem, list, itemIndex} = focus
    const keyGen = snapshot.context.keyGenerator

    const parentListItem = getAncestor(snapshot, list.path, isListItem)
    if (!parentListItem) {
      return false
    }
    const parentList = getAncestor(snapshot, parentListItem.path, isList)
    if (!parentList) {
      return false
    }

    const itemsAfter = list.node.items.slice(itemIndex + 1)
    const isFirstItem = itemIndex === 0
    const sourceKind = list.node.kind

    // Trailing siblings (if any) come along as a nested list of the source kind.
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
      // Insert first - source paths still resolve against the snapshot's tree,
      // and the destination anchor (parent list-item) is still valid.
      raise({
        type: 'insert',
        at: childPath(parentList.path, 'items', parentListItem.node),
        value: liftedItem,
        position: 'after',
      }),
    ]

    if (isFirstItem) {
      // Original nested list is now empty; remove it.
      raises.push(raise({type: 'unset', at: list.path}))
      // If the parent list-item held only that list, remove it too.
      if (parentListItem.node.content.length === 1) {
        raises.push(raise({type: 'unset', at: parentListItem.path}))
      }
    } else {
      // Remove the lifted item and any trailing siblings (they came along).
      raises.push(raise({type: 'unset', at: listItem.path}))
      for (const item of itemsAfter) {
        raises.push(
          raise({type: 'unset', at: childPath(list.path, 'items', item)}),
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

    return {raises}
  },
  actions: [(_, {raises}) => raises],
})

// ---------------------------------------------------------------------------
// Plugin component + test runner wiring
// ---------------------------------------------------------------------------

function StructuredListsPlugin() {
  const editor = useEditor()
  useEffect(() => {
    const unregisters = [
      editor.registerNode({node: listContainer}),
      editor.registerNode({node: listItemContainer}),
      editor.registerNode({node: codeBlockContainer}),
      editor.registerBehavior({behavior: sinkOnTab}),
      editor.registerBehavior({behavior: liftOnShiftTab}),
    ]
    return () => {
      for (const unregister of unregisters) {
        unregister()
      }
    }
  }, [editor])
  return null
}

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        schemaDefinition,
        children: <StructuredListsPlugin />,
      })

      context.keyMap = new Map()
      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: pluginStructuredListsFeature,
  stepDefinitions,
  parameterTypes,
})
