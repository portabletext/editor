import {
  applyAll,
  type DiffMatchPatch,
  type InsertPatch,
  type Patch,
  type SetIfMissingPatch,
  type SetPatch,
  type UnsetPatch,
} from '@portabletext/patches'
import {
  isTextBlock,
  type PortableTextBlock,
  type PortableTextChild,
} from '@portabletext/schema'
import {
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as diffMatchPatchApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import type {EditorContext} from '../editor/editor-snapshot'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {pathRef} from '../slate/editor/path-ref'
import type {Node} from '../slate/interfaces/node'
import {isObjectNode} from '../slate/node/is-object-node'
import {isSpanNode} from '../slate/node/is-span-node'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import type {Path} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applyDeselect, applySelect} from './apply-selection'
import {applySetNode} from './apply-set-node'
import {resolveNodePath} from './resolve-node-path'
import {isEqualToEmptyEditor, toSlateBlock} from './values'

function resolveContext(editor: PortableTextSlateEditor) {
  return {
    schema: editor.schema,
    editableTypes: editor.editableTypes,
    value: editor.children,
    blockIndexMap: editor.blockIndexMap,
  }
}

/**
 * Creates a function that can apply a patch onto a PortableTextSlateEditor.
 */
export function createApplyPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
): (editor: PortableTextSlateEditor, patch: Patch) => boolean {
  return (editor: PortableTextSlateEditor, patch: Patch): boolean => {
    let changed = false

    try {
      switch (patch.type) {
        case 'insert':
          changed = insertPatch(context, editor, patch)
          break
        case 'unset':
          changed = unsetPatch(editor, patch)
          break
        case 'set':
          changed = setPatch(editor, patch)
          break
        case 'setIfMissing':
          changed = setPatch(editor, patch)
          break
        case 'diffMatchPatch':
          changed = diffMatchPatch(editor, patch)
          break
      }
    } catch (err) {
      console.error(err)
    }

    return changed
  }
}

function diffMatchPatch(
  editor: PortableTextSlateEditor,
  patch: DiffMatchPatch,
): boolean {
  const resolved = resolveNodePath(resolveContext(editor), patch.path)

  if (!resolved) {
    return false
  }

  const {indexedPath, propertyPath} = resolved

  if (propertyPath.length !== 1 || propertyPath.at(0) !== 'text') {
    return false
  }

  const entry = getNode(editor, indexedPath)

  if (!entry || !isSpanNode({schema: editor.schema}, entry.node)) {
    return false
  }

  const spanNode = entry.node
  const text = typeof spanNode.text === 'string' ? spanNode.text : ''

  const patches = parsePatch(patch.value)
  const [newValue] = diffMatchPatchApplyPatches(patches, text, {
    allowExceedingIndices: true,
  })
  const diff = cleanupEfficiency(makeDiff(text, newValue), 5)

  let offset = 0
  for (const [op, diffText] of diff) {
    if (op === DIFF_INSERT) {
      editor.apply({
        type: 'insert_text',
        path: indexedPath,
        offset,
        text: diffText,
      })
      offset += diffText.length
    } else if (op === DIFF_DELETE) {
      editor.apply({
        type: 'remove_text',
        path: indexedPath,
        offset,
        text: diffText,
      })
    } else if (op === DIFF_EQUAL) {
      offset += diffText.length
    }
  }

  return true
}

function insertPatch(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'> & {
    initialValue: Array<PortableTextBlock> | undefined
  },
  editor: PortableTextSlateEditor,
  patch: InsertPatch,
) {
  const resolved = resolveNodePath(resolveContext(editor), patch.path)

  if (!resolved) {
    // Handle numeric insert (e.g., path [0] for inserting into empty editor)
    if (patch.path.length === 1 && typeof patch.path.at(0) === 'number') {
      const numericIndex = patch.path.at(0) as number
      const blocksToInsert = patch.items.map((item) =>
        toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
      )

      const editorWasEmptyBefore = isEqualToEmptyEditor(
        context.initialValue,
        editor.children,
        context.schema,
      )

      blocksToInsert.forEach((node, i) => {
        editor.apply({
          type: 'insert_node',
          path: [numericIndex + i],
          node,
        })
      })

      if (editorWasEmptyBefore && numericIndex === 0) {
        const {position} = patch
        const removeIdx = position === 'before' ? blocksToInsert.length : 0
        const removeEntry = getNode(editor, [removeIdx])
        if (!removeEntry) {
          return true
        }
        editor.apply({
          type: 'remove_node',
          path: [removeIdx],
          node: removeEntry.node,
        })
      }

      return true
    }

    return false
  }

  const {indexedPath, propertyPath} = resolved

  // When propertyPath is non-empty, the insert target is inside a container
  // that we can't resolve deeper into. Apply the insert on the resolved node
  // using applyAll and update via applySetNode.
  if (propertyPath.length !== 0) {
    const entry = getNode(editor, indexedPath)

    if (!entry) {
      return false
    }

    const updatedNode = applyAll(entry.node, [
      {
        ...patch,
        path: propertyPath,
      },
    ])

    applySetNode(editor, updatedNode, indexedPath)

    return true
  }

  // Insert blocks (path resolves to a single block)
  if (indexedPath.length === 1) {
    const {items, position} = patch
    const blocksToInsert = items.map((item) =>
      toSlateBlock(item as PortableTextBlock, {schemaTypes: context.schema}),
    )
    const targetBlockIndex = indexedPath.at(0)!
    const normalizedIdx =
      position === 'after' ? targetBlockIndex + 1 : targetBlockIndex

    const editorWasEmptyBefore = isEqualToEmptyEditor(
      context.initialValue,
      editor.children,
      context.schema,
    )

    blocksToInsert.forEach((node, i) => {
      editor.apply({type: 'insert_node', path: [normalizedIdx + i], node})
    })

    if (
      editorWasEmptyBefore &&
      typeof patch.path.at(0) === 'number' &&
      patch.path.at(0) === 0
    ) {
      const removeIdx =
        position === 'before'
          ? targetBlockIndex + blocksToInsert.length
          : targetBlockIndex
      const removeEntry = getNode(editor, [removeIdx])
      if (!removeEntry) {
        return false
      }
      editor.apply({
        type: 'remove_node',
        path: [removeIdx],
        node: removeEntry.node,
      })
    }

    return true
  }

  // Insert children (path resolves to a child node at depth >= 2)
  const {items, position} = patch

  // Resolve the parent node by stripping the last field+key from the patch path
  const parentPatchPath = patch.path.slice(0, -2)
  const parentResolved = resolveNodePath(
    resolveContext(editor),
    parentPatchPath,
  )

  if (!parentResolved || parentResolved.propertyPath.length !== 0) {
    return false
  }

  const parentPath = parentResolved.indexedPath
  const parentEntry = getNode(editor, parentPath)

  if (!parentEntry) {
    return false
  }

  const targetChildIndex = indexedPath.at(-1)!
  const normalizedIdx =
    position === 'after' ? targetChildIndex + 1 : targetChildIndex

  if (isTextBlock({schema: editor.schema}, parentEntry.node)) {
    const childrenToInsert = toSlateBlock(
      {...parentEntry.node, children: items as PortableTextChild[]},
      {schemaTypes: context.schema},
    )

    if (
      childrenToInsert &&
      isTextBlock({schema: editor.schema}, childrenToInsert)
    ) {
      childrenToInsert.children.forEach((node: Node, i: number) => {
        editor.apply({
          type: 'insert_node',
          path: [...parentPath, normalizedIdx + i],
          node,
        })
      })
    }
  }

  return true
}

function setPatch(
  editor: PortableTextSlateEditor,
  patch: SetPatch | SetIfMissingPatch,
) {
  let value = patch.value

  // Full value replacement (path [])
  if (patch.path.length === 0) {
    if (!Array.isArray(value)) {
      return false
    }

    // setIfMissing at root is a noop when the editor already has content
    if (patch.type === 'setIfMissing' && editor.children.length > 0) {
      return false
    }

    const previousSelection = editor.selection

    // Remove all existing blocks in reverse order
    for (let i = editor.children.length - 1; i >= 0; i--) {
      const node = editor.children.at(i)
      if (node) {
        editor.apply({type: 'remove_node', path: [i], node})
      }
    }

    // Insert the new blocks
    let insertIndex = 0
    for (const block of value) {
      editor.apply({
        type: 'insert_node',
        path: [insertIndex],
        node: block as Node,
      })

      insertIndex++
    }

    // Restore the selection if it's still valid
    if (previousSelection) {
      applySelect(editor, previousSelection)
    }

    return true
  }

  const resolved = resolveNodePath(resolveContext(editor), patch.path)

  if (!resolved) {
    return false
  }

  const {indexedPath, propertyPath} = resolved
  const entry = getNode(editor, indexedPath)

  if (!entry) {
    return false
  }

  // Rewrite value for property-level text patches on spans
  if (propertyPath.length > 0 && propertyPath.at(0) === 'text') {
    value = {}
    value['text'] = patch.value
  }

  // Node-level set (propertyPath is empty)
  if (propertyPath.length === 0) {
    if (
      isTextBlock({schema: editor.schema}, entry.node) &&
      isTextBlock({schema: editor.schema}, value)
    ) {
      // Full text block replacement
      const updatedBlock = applyAll(entry.node, [
        {
          ...patch,
          path: [],
        },
      ])

      applySetNode(editor, updatedBlock, indexedPath)

      const previousSelection = editor.selection

      // Remove the previous children in reverse order
      const children = getChildren(editor, indexedPath)

      const childPaths = Array.from(children.reverse(), (childEntry) =>
        pathRef(editor, childEntry.path),
      )
      for (const ref of childPaths) {
        const childPath = ref.unref()!
        if (childPath) {
          const childNodeEntry = getNode(editor, childPath)
          if (!childNodeEntry) {
            continue
          }
          editor.apply({
            type: 'remove_node',
            path: childPath,
            node: childNodeEntry.node,
          })
        }
      }

      // Insert the new children
      if (isTextBlock({schema: editor.schema}, updatedBlock)) {
        updatedBlock.children.forEach((node: Node, i: number) => {
          editor.apply({
            type: 'insert_node',
            path: [...indexedPath, i],
            node,
          })
        })
      }

      // Restore the selection
      if (previousSelection) {
        applySelect(editor, previousSelection)
      }

      return true
    }

    // Non-text-block node-level set
    const updatedNode = applyAll(entry.node, [
      {
        ...patch,
        path: [],
      },
    ])

    applySetNode(editor, updatedNode, indexedPath)

    return true
  }

  // Property-level set (propertyPath is non-empty)
  if (isSpanNode({schema: editor.schema}, entry.node)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      'text' in value &&
      typeof value['text'] === 'string'
    ) {
      if (patch.type === 'setIfMissing') {
        return false
      }

      const oldText = typeof entry.node.text === 'string' ? entry.node.text : ''
      const newText = value['text'] as string
      if (oldText !== newText) {
        editor.apply({
          type: 'remove_text',
          path: indexedPath,
          offset: 0,
          text: oldText,
        })
        editor.apply({
          type: 'insert_text',
          path: indexedPath,
          offset: 0,
          text: newText,
        })
        // call onChange here to emit the new selection
        // the user's selection might be interfering with
        editor.onChange()
      }
    } else {
      // Setting non-text span property
      const propEntry = propertyPath.at(0)
      const reservedProps = ['_key', '_type', 'text']

      if (propEntry === undefined) {
        return false
      }

      if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
        return false
      }

      const newNode = applyAll(entry.node, [
        {
          ...patch,
          path: propertyPath,
        },
      ])

      applySetNode(editor, newNode, indexedPath)
    }

    return true
  }

  if (isTextBlockNode({schema: editor.schema}, entry.node)) {
    const updatedBlock = applyAll(entry.node, [
      {
        ...patch,
        path: propertyPath,
      },
    ])

    applySetNode(editor, updatedBlock, indexedPath)

    return true
  }

  // Object node (block objects, inline objects, container nodes)
  if (isObjectNode({schema: editor.schema}, entry.node)) {
    // Only guard reserved props for child-level objects (inline objects)
    if (indexedPath.length >= 2) {
      const propEntry = propertyPath.at(0)
      const reservedProps = ['_key', '_type', 'children']

      if (propEntry === undefined) {
        return false
      }

      if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
        return false
      }
    }

    const newNode = applyAll(entry.node, [
      {
        ...patch,
        path: propertyPath,
      },
    ])

    applySetNode(editor, newNode, indexedPath)

    return true
  }

  // Fallback
  const updatedNode = applyAll(entry.node, [
    {
      ...patch,
      path: propertyPath,
    },
  ])

  applySetNode(editor, updatedNode, indexedPath)

  return true
}

function applyPropertyUnset(
  editor: PortableTextSlateEditor,
  node: Node,
  patch: UnsetPatch,
  propertyPath: Path,
  indexedPath: Array<number>,
) {
  const updatedNode = applyAll(node, [{...patch, path: propertyPath}])
  const removedProperties = Object.keys(node).filter(
    (property) => !(property in updatedNode),
  )

  if (removedProperties.length > 0) {
    const unsetProps: Record<string, null> = {}
    for (const prop of removedProperties) {
      unsetProps[prop] = null
    }
    applySetNode(editor, unsetProps, indexedPath)
  } else {
    applySetNode(editor, updatedNode, indexedPath)
  }
}

function unsetPatch(editor: PortableTextSlateEditor, patch: UnsetPatch) {
  // Value
  if (patch.path.length === 0) {
    applyDeselect(editor)

    const children = getChildren(editor, [])

    for (let index = children.length - 1; index >= 0; index--) {
      const entry = children.at(index)
      if (!entry) {
        continue
      }
      const {node, path: nodePath} = entry
      editor.apply({type: 'remove_node', path: nodePath, node})
    }

    return true
  }

  const resolved = resolveNodePath(resolveContext(editor), patch.path)

  if (!resolved) {
    return false
  }

  const {indexedPath, propertyPath} = resolved
  const entry = getNode(editor, indexedPath)

  if (!entry) {
    return false
  }

  // Node-level unset (remove the node entirely)
  if (propertyPath.length === 0) {
    editor.apply({
      type: 'remove_node',
      path: indexedPath,
      node: entry.node,
    })

    return true
  }

  // Property-level unset
  if (isSpanNode({schema: editor.schema}, entry.node)) {
    const propEntry = propertyPath.at(0)
    const reservedProps = ['_key', '_type']

    if (propEntry === undefined) {
      return false
    }

    if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
      return false
    }

    if (typeof propEntry === 'string' && propEntry === 'text') {
      const text = typeof entry.node.text === 'string' ? entry.node.text : ''
      editor.apply({
        type: 'remove_text',
        path: indexedPath,
        offset: 0,
        text,
      })

      return true
    }

    applyPropertyUnset(editor, entry.node, patch, propertyPath, indexedPath)

    return true
  }

  if (isTextBlockNode({schema: editor.schema}, entry.node)) {
    const propEntry = propertyPath.at(0)
    const reservedProps = ['_key', '_type', 'children']

    if (propEntry === undefined) {
      return false
    }

    if (typeof propEntry !== 'string') {
      return false
    }

    if (reservedProps.includes(propEntry)) {
      return false
    }

    if (propertyPath.length === 1) {
      applySetNode(editor, {[propEntry]: null}, indexedPath)
    } else {
      const updatedBlock = applyAll(entry.node, [
        {
          ...patch,
          path: propertyPath,
        },
      ]) as unknown as Record<string, unknown>

      applySetNode(editor, {[propEntry]: updatedBlock[propEntry]}, indexedPath)
    }

    return true
  }

  if (isObjectNode({schema: editor.schema}, entry.node)) {
    const propEntry = propertyPath.at(0)
    const reservedProps = ['_key', '_type', 'children']

    if (propEntry === undefined) {
      return false
    }

    if (typeof propEntry === 'string' && reservedProps.includes(propEntry)) {
      return false
    }

    applyPropertyUnset(editor, entry.node, patch, propertyPath, indexedPath)

    return true
  }

  // Fallback
  applyPropertyUnset(editor, entry.node, patch, propertyPath, indexedPath)

  return true
}
