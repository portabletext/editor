import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../src/editor/editor-snapshot'
import {safeStringify} from '../src/internal-utils/safe-json'
import {lookupContainer} from '../src/schema/lookup-container'
import type {Path, PathSegment} from '../src/slate/interfaces/path'
import type {EditorSelection, EditorSelectionPoint} from '../src/types/editor'
import {collapseSelection} from './collapse-selection'
import {splitString} from './split-string'
import {stringOverlap} from './string-overlap'

type TextBlockEntry = {
  block: PortableTextBlock
  path: Path
}

/**
 * Recursively walk the value to collect every text block paired with its
 * full path, descending through registered editable containers.
 */
function collectTextBlocks(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
): Array<TextBlockEntry> {
  const entries: Array<TextBlockEntry> = []
  walkBlocks(context, context.value, [], '', entries)
  return entries
}

function walkBlocks(
  context: Pick<EditorContext, 'schema' | 'containers'>,
  blocks: ReadonlyArray<unknown>,
  basePath: Path,
  scopePath: string,
  entries: Array<TextBlockEntry>,
): void {
  for (const block of blocks) {
    if (
      typeof block !== 'object' ||
      block === null ||
      typeof (block as {_key?: unknown})._key !== 'string'
    ) {
      continue
    }
    const _key = (block as {_key: string})._key
    const path: Path = [...basePath, {_key} as PathSegment]

    if (isTextBlock(context, block as PortableTextBlock)) {
      entries.push({block: block as PortableTextBlock, path})
      continue
    }

    const containerScope =
      typeof (block as {_type?: unknown})._type === 'string'
        ? scopePath === ''
          ? (block as {_type: string})._type
          : `${scopePath}.${(block as {_type: string})._type}`
        : ''
    if (!containerScope) {
      continue
    }
    const container = lookupContainer(context.containers, containerScope)
    if (!container) {
      continue
    }

    const fieldName = container.field.name
    const fieldValue = (block as Record<string, unknown>)[fieldName]
    if (!Array.isArray(fieldValue)) {
      continue
    }

    walkBlocks(
      context,
      fieldValue,
      [...path, fieldName],
      containerScope,
      entries,
    )
  }
}

/**
 * Throw an error if the selection cannot be found.
 *
 * Only to be used in tests.
 */
export function getTextSelection(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  text: string,
): NonNullable<EditorSelection> {
  let anchor: EditorSelectionPoint | undefined
  let focus: EditorSelectionPoint | undefined

  for (const {block, path} of collectTextBlocks(context)) {
    if (!isTextBlock(context, block)) {
      continue
    }
    for (const child of block.children) {
      if (isSpan(context, child)) {
        const childPath: Path = [...path, 'children', {_key: child._key}]

        if (child.text === text) {
          anchor = {path: childPath, offset: 0}
          focus = {path: childPath, offset: text.length}
          break
        }

        const splitChildText = splitString(child.text, text)

        if (splitChildText[0] === '' && splitChildText[1] !== '') {
          anchor = {path: childPath, offset: 0}
          focus = {path: childPath, offset: text.length}
          break
        }

        if (
          splitChildText[0] !== '' &&
          splitChildText[1] === '' &&
          child.text.indexOf(text) !== -1
        ) {
          anchor = {
            path: childPath,
            offset: child.text.length - text.length,
          }
          focus = {path: childPath, offset: child.text.length}
          break
        }

        if (splitChildText[0] !== '' && splitChildText[1] !== '') {
          anchor = {path: childPath, offset: splitChildText[0].length}
          focus = {
            path: childPath,
            offset: splitChildText[0].length + text.length,
          }
          break
        }

        const overlap = stringOverlap(child.text, text)

        if (overlap !== '') {
          if (child.text.lastIndexOf(overlap) >= 0 && !anchor) {
            anchor = {
              path: childPath,
              offset: child.text.lastIndexOf(overlap),
            }
            continue
          }

          if (child.text.indexOf(overlap) === 0) {
            focus = {path: childPath, offset: overlap.length}
          }
        }
      }
    }
  }

  if (!anchor || !focus) {
    throw new Error(
      `Unable to find selection for text "${text}" in value "${safeStringify(context.value)}"`,
    )
  }

  return {
    anchor,
    focus,
    backward: false,
  }
}

/**
 * Throw an error if the selection cannot be found.
 *
 * Only to be used in tests.
 */
export function getSelectionBeforeText(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  text: string,
): NonNullable<EditorSelection> {
  return collapseSelection(getTextSelection(context, text), 'start')
}

/**
 * Throw an error if the selection cannot be found.
 *
 * Only to be used in tests.
 */
export function getSelectionAfterText(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  text: string,
): NonNullable<EditorSelection> {
  return collapseSelection(getTextSelection(context, text), 'end')
}
