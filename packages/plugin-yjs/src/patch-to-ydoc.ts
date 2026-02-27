import type {
  DiffMatchPatch,
  InsertPatch,
  Patch,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from '@portabletext/patches'
import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  applyPatches as dmpApplyPatches,
  makeDiff,
  parsePatch,
} from '@sanity/diff-match-patch'
import * as Y from 'yjs'

export function applyPatchToYDoc(
  patch: Patch,
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): void {
  switch (patch.type) {
    case 'diffMatchPatch':
      applyDiffMatchPatch(patch, blocksMap)
      break
    case 'set':
      applySetPatch(patch, blocksMap, orderArray)
      break
    case 'unset':
      applyUnsetPatch(patch, blocksMap, orderArray)
      break
    case 'insert':
      applyInsertPatch(patch, blocksMap, orderArray)
      break
    case 'setIfMissing':
      applySetIfMissingPatch(patch, blocksMap)
      break
  }
}

function resolveBlockKey(path: any[]): string | undefined {
  const first = path[0]
  if (typeof first === 'object' && first !== null && '_key' in first) {
    return first['_key'] // biome-ignore lint/complexity/useLiteralKeys: TS index signature
  }
  return undefined
}

function resolveChildKey(path: any[]): string | undefined {
  // Path like [{_key: "block1"}, "children", {_key: "span1"}, ...]
  if (path.length >= 3 && path[1] === 'children') {
    const third = path[2]
    if (typeof third === 'object' && third !== null && '_key' in third) {
      return third['_key'] // biome-ignore lint/complexity/useLiteralKeys: TS index signature
    }
  }
  return undefined
}

function findChildIndex(childrenArray: Y.Array<any>, childKey: string): number {
  for (let i = 0; i < childrenArray.length; i++) {
    const child = childrenArray.get(i)
    if (child instanceof Y.Map && child.get('_key') === childKey) {
      return i
    }
  }
  return -1
}

function findOrderIndex(orderArray: Y.Array<string>, key: string): number {
  for (let i = 0; i < orderArray.length; i++) {
    if (orderArray.get(i) === key) {
      return i
    }
  }
  return -1
}

function applyDiffMatchPatch(
  patch: DiffMatchPatch,
  blocksMap: Y.Map<any>,
): void {
  // Path: [{_key}, "children", {_key}, "text"]
  const blockKey = resolveBlockKey(patch.path)
  const childKey = resolveChildKey(patch.path)
  if (!blockKey || !childKey) {
    return
  }

  const blockMap = blocksMap.get(blockKey)
  if (!(blockMap instanceof Y.Map)) {
    return
  }

  const children = blockMap.get('children')
  if (!(children instanceof Y.Array)) {
    return
  }

  const childIndex = findChildIndex(children, childKey)
  if (childIndex === -1) {
    return
  }

  const childMap = children.get(childIndex)
  if (!(childMap instanceof Y.Map)) {
    return
  }

  const yText = childMap.get('text')
  if (!(yText instanceof Y.Text)) {
    return
  }

  // Parse the DMP patch and apply character-level operations to Y.Text
  const currentText = yText.toString()
  const patches = parsePatch(patch.value)
  const [newText] = dmpApplyPatches(patches, currentText, {
    allowExceedingIndices: true,
  })

  // Compute the diff and apply to Y.Text
  const diff = makeDiff(currentText, newText)
  let offset = 0
  for (const [op, text] of diff) {
    if (op === DIFF_INSERT) {
      yText.insert(offset, text)
      offset += text.length
    } else if (op === DIFF_DELETE) {
      yText.delete(offset, text.length)
    } else if (op === DIFF_EQUAL) {
      offset += text.length
    }
  }
}

function applySetPatch(
  patch: SetPatch,
  blocksMap: Y.Map<any>,
  _orderArray: Y.Array<string>,
): void {
  const blockKey = resolveBlockKey(patch.path)
  if (!blockKey) {
    // Could be a full document set or index-based _key change
    return
  }

  const blockMap = blocksMap.get(blockKey)
  if (!(blockMap instanceof Y.Map)) {
    return
  }

  if (patch.path.length === 1) {
    // Full block replacement: set({_key, _type, style, children, ...}, [{_key}])
    // Replace all properties on the block
    const value = patch.value as Record<string, unknown>
    if (typeof value === 'object' && value !== null) {
      // Update block properties
      for (const [key, val] of Object.entries(value)) {
        if (key === 'children' && Array.isArray(val)) {
          // Replace children array
          const existingChildren = blockMap.get('children')
          if (existingChildren instanceof Y.Array) {
            existingChildren.delete(0, existingChildren.length)
          }
          const childrenArray =
            existingChildren instanceof Y.Array
              ? existingChildren
              : new Y.Array()
          for (const child of val) {
            const childMap = new Y.Map()
            for (const [ck, cv] of Object.entries(
              child as Record<string, unknown>,
            )) {
              if (ck === 'text' && typeof cv === 'string') {
                childMap.set(ck, new Y.Text(cv))
              } else {
                childMap.set(ck, cv)
              }
            }
            childrenArray.push([childMap])
          }
          if (!(existingChildren instanceof Y.Array)) {
            blockMap.set('children', childrenArray)
          }
        } else if (key === 'markDefs' && Array.isArray(val)) {
          const existingMarkDefs = blockMap.get('markDefs')
          if (existingMarkDefs instanceof Y.Array) {
            existingMarkDefs.delete(0, existingMarkDefs.length)
          }
          const markDefsArray =
            existingMarkDefs instanceof Y.Array
              ? existingMarkDefs
              : new Y.Array()
          for (const markDef of val) {
            const markDefMap = new Y.Map()
            for (const [mk, mv] of Object.entries(
              markDef as Record<string, unknown>,
            )) {
              markDefMap.set(mk, mv)
            }
            markDefsArray.push([markDefMap])
          }
          if (!(existingMarkDefs instanceof Y.Array)) {
            blockMap.set('markDefs', markDefsArray)
          }
        } else {
          blockMap.set(key, val)
        }
      }
    }
    return
  }

  if (patch.path.length === 2) {
    // Block property: set(value, [{_key}, "style"])
    const prop = patch.path[1]
    if (typeof prop === 'string') {
      blockMap.set(prop, patch.value)
    }
    return
  }

  // Span property: set(value, [{_key}, "children", {_key}, "marks"])
  const childKey = resolveChildKey(patch.path)
  if (!childKey) {
    return
  }

  const children = blockMap.get('children')
  if (!(children instanceof Y.Array)) {
    return
  }

  const childIndex = findChildIndex(children, childKey)
  if (childIndex === -1) {
    return
  }

  const childMap = children.get(childIndex)
  if (!(childMap instanceof Y.Map)) {
    return
  }

  if (patch.path.length === 4) {
    const prop = patch.path[3]
    if (typeof prop === 'string') {
      if (prop === 'text' && typeof patch.value === 'string') {
        // Full text replacement — replace Y.Text content
        const yText = childMap.get('text')
        if (yText instanceof Y.Text) {
          const currentText = yText.toString()
          if (currentText !== patch.value) {
            yText.delete(0, currentText.length)
            yText.insert(0, patch.value)
          }
        }
      } else {
        childMap.set(prop, patch.value)
      }
    }
  }
}

function applyUnsetPatch(
  patch: UnsetPatch,
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): void {
  if (patch.path.length === 0) {
    // Unset entire document
    blocksMap.forEach((_, key) => {
      blocksMap.delete(key)
    })
    orderArray.delete(0, orderArray.length)
    return
  }

  const blockKey = resolveBlockKey(patch.path)
  if (!blockKey) {
    return
  }

  if (patch.path.length === 1) {
    // Remove block
    blocksMap.delete(blockKey)
    const orderIndex = findOrderIndex(orderArray, blockKey)
    if (orderIndex !== -1) {
      orderArray.delete(orderIndex, 1)
    }
    return
  }

  // Remove span or block property
  const blockMap = blocksMap.get(blockKey)
  if (!(blockMap instanceof Y.Map)) {
    return
  }

  if (patch.path.length === 2) {
    // Remove block property
    const prop = patch.path[1]
    if (typeof prop === 'string') {
      blockMap.delete(prop)
    }
    return
  }

  // Remove span: [{_key}, "children", {_key}]
  const childKey = resolveChildKey(patch.path)
  if (!childKey) {
    return
  }

  const children = blockMap.get('children')
  if (!(children instanceof Y.Array)) {
    return
  }

  if (patch.path.length === 3) {
    const childIndex = findChildIndex(children, childKey)
    if (childIndex !== -1) {
      children.delete(childIndex, 1)
    }
    return
  }

  // Remove span property: [{_key}, "children", {_key}, "marks"]
  if (patch.path.length === 4) {
    const childIndex = findChildIndex(children, childKey)
    if (childIndex === -1) {
      return
    }
    const childMap = children.get(childIndex)
    if (!(childMap instanceof Y.Map)) {
      return
    }
    const prop = patch.path[3]
    if (typeof prop === 'string') {
      childMap.delete(prop)
    }
  }
}

function applyInsertPatch(
  patch: InsertPatch,
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): void {
  const blockKey = resolveBlockKey(patch.path)

  if (patch.path.length === 1 && blockKey) {
    // Insert blocks before/after a block
    for (const item of patch.items) {
      const block = item as Record<string, unknown>
      const newKey = block['_key'] as string
      if (!newKey) {
        continue
      }

      // Create the block in the map
      const blockMap = new Y.Map()
      for (const [key, val] of Object.entries(block)) {
        if (key === 'children' && Array.isArray(val)) {
          const childrenArray = new Y.Array()
          for (const child of val) {
            const childMap = new Y.Map()
            for (const [ck, cv] of Object.entries(
              child as Record<string, unknown>,
            )) {
              if (ck === 'text' && typeof cv === 'string') {
                childMap.set(ck, new Y.Text(cv))
              } else {
                childMap.set(ck, cv)
              }
            }
            childrenArray.push([childMap])
          }
          blockMap.set(key, childrenArray)
        } else if (key === 'markDefs' && Array.isArray(val)) {
          const markDefsArray = new Y.Array()
          for (const markDef of val) {
            const markDefMap = new Y.Map()
            for (const [mk, mv] of Object.entries(
              markDef as Record<string, unknown>,
            )) {
              markDefMap.set(mk, mv)
            }
            markDefsArray.push([markDefMap])
          }
          blockMap.set(key, markDefsArray)
        } else {
          blockMap.set(key, val)
        }
      }
      blocksMap.set(newKey, blockMap)

      // Insert into order array
      const targetIndex = findOrderIndex(orderArray, blockKey)
      if (targetIndex !== -1) {
        const insertIndex =
          patch.position === 'after' ? targetIndex + 1 : targetIndex
        orderArray.insert(insertIndex, [newKey])
      } else {
        orderArray.push([newKey])
      }
    }
    return
  }

  // Insert children (spans)
  if (patch.path.length >= 3 && blockKey) {
    const blockMap = blocksMap.get(blockKey)
    if (!(blockMap instanceof Y.Map)) {
      return
    }

    const children = blockMap.get('children')
    if (!(children instanceof Y.Array)) {
      return
    }

    const childKey = resolveChildKey(patch.path)
    let insertIndex: number

    if (childKey) {
      const targetIndex = findChildIndex(children, childKey)
      insertIndex = patch.position === 'after' ? targetIndex + 1 : targetIndex
    } else if (typeof patch.path[2] === 'number') {
      insertIndex =
        patch.position === 'after' ? patch.path[2] + 1 : patch.path[2]
    } else {
      insertIndex = children.length
    }

    for (const item of patch.items) {
      const child = item as Record<string, unknown>
      const childMap = new Y.Map()
      for (const [ck, cv] of Object.entries(child)) {
        if (ck === 'text' && typeof cv === 'string') {
          childMap.set(ck, new Y.Text(cv))
        } else {
          childMap.set(ck, cv)
        }
      }
      children.insert(insertIndex, [childMap])
      insertIndex++
    }
  }
}

function applySetIfMissingPatch(
  patch: SetIfMissingPatch,
  blocksMap: Y.Map<any>,
): void {
  // setIfMissing is defensive — only set if not present
  // Most common: setIfMissing([], [{_key}, "children"]) or setIfMissing([], [])
  const blockKey = resolveBlockKey(patch.path)
  if (!blockKey) {
    return
  }

  const blockMap = blocksMap.get(blockKey)
  if (!(blockMap instanceof Y.Map)) {
    return
  }

  if (patch.path.length === 2) {
    const prop = patch.path[1]
    if (typeof prop === 'string' && !blockMap.has(prop)) {
      if (Array.isArray(patch.value)) {
        blockMap.set(prop, new Y.Array())
      } else {
        blockMap.set(prop, patch.value)
      }
    }
  }
}
