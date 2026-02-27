import type {Patch} from '@portabletext/patches'
import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import * as Y from 'yjs'

export function yEventsToPatches(
  events: Y.YEvent<any>[],
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
): Patch[] {
  const patches: Patch[] = []

  for (const event of events) {
    if (event.target === blocksMap) {
      // Block-level changes (add/remove blocks)
      handleBlockMapChanges(event, blocksMap, orderArray, patches)
    } else if (event.target === orderArray) {
      // Order changes are handled via block map changes
      // (insert/delete in order array accompanies block add/remove)
    } else {
      // Changes within a block
      handleNestedChanges(event, blocksMap, orderArray, patches)
    }
  }

  return patches
}

function handleBlockMapChanges(
  event: Y.YEvent<any>,
  blocksMap: Y.Map<any>,
  orderArray: Y.Array<string>,
  patches: Patch[],
): void {
  if (!(event instanceof Y.YMapEvent)) {
    return
  }

  for (const [key, change] of event.changes.keys) {
    if (change.action === 'add') {
      // New block added — find its position in order array
      const blockMap = blocksMap.get(key)
      if (!(blockMap instanceof Y.Map)) {
        continue
      }

      const block = yMapToPlainObject(blockMap)
      const orderIndex = findInArray(orderArray, key)

      if (orderIndex > 0) {
        const prevKey = orderArray.get(orderIndex - 1)
        patches.push({
          type: 'insert',
          path: [{_key: prevKey}],
          position: 'after',
          items: [block],
        })
      } else if (orderArray.length > 1) {
        const nextKey = orderArray.get(1)
        patches.push({
          type: 'insert',
          path: [{_key: nextKey}],
          position: 'before',
          items: [block],
        })
      } else {
        patches.push({
          type: 'insert',
          path: [0],
          position: 'before',
          items: [block],
        })
      }
    } else if (change.action === 'delete') {
      patches.push({
        type: 'unset',
        path: [{_key: key}],
      })
    } else if (change.action === 'update') {
      // Block was replaced — emit a full set
      const blockMap = blocksMap.get(key)
      if (blockMap instanceof Y.Map) {
        patches.push({
          type: 'set',
          path: [{_key: key}],
          value: yMapToPlainObject(blockMap),
        })
      }
    }
  }
}

function handleNestedChanges(
  event: Y.YEvent<any>,
  blocksMap: Y.Map<any>,
  _orderArray: Y.Array<string>,
  patches: Patch[],
): void {
  // Walk up to find the block key
  const path = event.path
  if (path.length === 0) {
    return
  }

  // Find the block this event belongs to
  let blockKey: string | undefined
  let blockMap: Y.Map<any> | undefined

  // The path from observeDeep gives us the traversal from the root
  // For blocksMap, path[0] is the block key
  for (const [key, value] of blocksMap.entries()) {
    if (isAncestorOf(value, event.target)) {
      blockKey = key
      blockMap = value as Y.Map<any>
      break
    }
  }

  if (!blockKey || !blockMap) {
    return
  }

  if (event.target instanceof Y.Text) {
    // Text change within a span
    handleTextChange(event, blockKey, blockMap, patches)
  } else if (event.target instanceof Y.Map) {
    // Property change on a block or span
    handleMapChange(event, blockKey, blockMap, patches)
  } else if (event.target instanceof Y.Array) {
    // Children array change
    handleArrayChange(event, blockKey, blockMap, patches)
  }
}

function handleTextChange(
  event: Y.YEvent<any>,
  blockKey: string,
  blockMap: Y.Map<any>,
  patches: Patch[],
): void {
  const yText = event.target as Y.Text
  // Find which child this text belongs to
  const children = blockMap.get('children')
  if (!(children instanceof Y.Array)) {
    return
  }

  for (let i = 0; i < children.length; i++) {
    const child = children.get(i)
    if (child instanceof Y.Map && child.get('text') === yText) {
      const childKey = child.get('_key') as string
      if (!childKey) {
        continue
      }

      // Reconstruct the text change as a diffMatchPatch
      // We need the old text — compute from the delta
      const newText = yText.toString()
      let oldText = newText

      // Walk the delta backwards to reconstruct old text
      if (event instanceof Y.YTextEvent && event.delta) {
        oldText = reconstructOldText(newText, event.delta)
      }

      if (oldText !== newText) {
        const dmpPatches = makePatches(oldText, newText)
        const value = stringifyPatches(dmpPatches)
        if (value.length > 0) {
          patches.push({
            type: 'diffMatchPatch',
            path: [{_key: blockKey}, 'children', {_key: childKey}, 'text'],
            value,
          })
        }
      }
      break
    }
  }
}

function reconstructOldText(newText: string, delta: any[]): string {
  // Walk the delta to reconstruct what the text was before
  let result = ''
  let newOffset = 0

  for (const op of delta) {
    if (op.retain !== undefined) {
      result += newText.slice(newOffset, newOffset + op.retain)
      newOffset += op.retain
    } else if (op.insert !== undefined) {
      // This was inserted — skip it in the new text
      const insertLen = typeof op.insert === 'string' ? op.insert.length : 1
      newOffset += insertLen
    } else if (op.delete !== undefined) {
      // This was deleted — we don't have the original text
      // We need to use a placeholder; in practice, we'd need the old text
      // For now, use empty string (the DMP will handle the diff)
      result += '?'.repeat(op.delete)
    }
  }

  // Append any remaining text
  result += newText.slice(newOffset)
  return result
}

function handleMapChange(
  event: Y.YEvent<any>,
  blockKey: string,
  blockMap: Y.Map<any>,
  patches: Patch[],
): void {
  if (!(event instanceof Y.YMapEvent)) {
    return
  }

  const targetMap = event.target as Y.Map<any>

  // Is this the block map itself?
  if (targetMap === blockMap) {
    for (const [key, change] of event.changes.keys) {
      if (key === 'children' || key === 'markDefs') {
        continue // handled by array events
      }
      if (change.action === 'delete') {
        patches.push({type: 'unset', path: [{_key: blockKey}, key]})
      } else {
        patches.push({
          type: 'set',
          path: [{_key: blockKey}, key],
          value: targetMap.get(key),
        })
      }
    }
    return
  }

  // Is this a child map?
  const children = blockMap.get('children')
  if (children instanceof Y.Array) {
    for (let i = 0; i < children.length; i++) {
      if (children.get(i) === targetMap) {
        const childKey = targetMap.get('_key') as string
        if (!childKey) {
          break
        }

        for (const [key, change] of event.changes.keys) {
          if (key === 'text') {
            continue // handled by text events
          }
          if (change.action === 'delete') {
            patches.push({
              type: 'unset',
              path: [{_key: blockKey}, 'children', {_key: childKey}, key],
            })
          } else {
            const value = targetMap.get(key)
            patches.push({
              type: 'set',
              path: [{_key: blockKey}, 'children', {_key: childKey}, key],
              value: value instanceof Y.Text ? value.toString() : value,
            })
          }
        }
        break
      }
    }
  }
}

function handleArrayChange(
  event: Y.YEvent<any>,
  blockKey: string,
  blockMap: Y.Map<any>,
  patches: Patch[],
): void {
  if (!(event instanceof Y.YArrayEvent)) {
    return
  }

  const targetArray = event.target as Y.Array<any>
  const children = blockMap.get('children')

  if (targetArray !== children) {
    return
  }

  let index = 0
  for (const delta of event.changes.delta) {
    if (delta.retain !== undefined) {
      index += delta.retain
    } else if (delta.delete !== undefined) {
      // Children were removed — we need the old keys
      // For now, emit unset for each removed child
      // Note: we don't have the old keys directly from the event
      // This is a limitation — we'd need to track state
    } else if (delta.insert !== undefined) {
      const items = delta.insert as any[]
      for (const item of items) {
        if (item instanceof Y.Map) {
          const child = yMapToPlainObject(item)
          // Find the adjacent child for positioning
          if (index > 0 && children instanceof Y.Array) {
            const prevChild = children.get(index - 1)
            if (prevChild instanceof Y.Map) {
              const prevKey = prevChild.get('_key') as string
              if (prevKey) {
                patches.push({
                  type: 'insert',
                  path: [{_key: blockKey}, 'children', {_key: prevKey}],
                  position: 'after',
                  items: [child],
                })
              }
            }
          } else {
            patches.push({
              type: 'insert',
              path: [{_key: blockKey}, 'children', 0],
              position: 'before',
              items: [child],
            })
          }
        }
        index++
      }
    }
  }
}

function isAncestorOf(potentialAncestor: any, target: any): boolean {
  if (potentialAncestor === target) {
    return true
  }
  if (potentialAncestor instanceof Y.Map) {
    for (const value of potentialAncestor.values()) {
      if (isAncestorOf(value, target)) {
        return true
      }
    }
  }
  if (potentialAncestor instanceof Y.Array) {
    for (let i = 0; i < potentialAncestor.length; i++) {
      if (isAncestorOf(potentialAncestor.get(i), target)) {
        return true
      }
    }
  }
  return false
}

function findInArray(arr: Y.Array<string>, value: string): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr.get(i) === value) {
      return i
    }
  }
  return -1
}

function yMapToPlainObject(yMap: Y.Map<any>): any {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of yMap.entries()) {
    if (value instanceof Y.Text) {
      obj[key] = value.toString()
    } else if (value instanceof Y.Map) {
      obj[key] = yMapToPlainObject(value)
    } else if (value instanceof Y.Array) {
      obj[key] = yArrayToPlainArray(value)
    } else {
      obj[key] = value
    }
  }
  return obj
}

function yArrayToPlainArray(yArray: Y.Array<any>): unknown[] {
  const arr: unknown[] = []
  for (let i = 0; i < yArray.length; i++) {
    const item = yArray.get(i)
    if (item instanceof Y.Map) {
      arr.push(yMapToPlainObject(item))
    } else if (item instanceof Y.Array) {
      arr.push(yArrayToPlainArray(item))
    } else if (item instanceof Y.Text) {
      arr.push(item.toString())
    } else {
      arr.push(item)
    }
  }
  return arr
}
