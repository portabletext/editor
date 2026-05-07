import type {EditorSelector} from '../editor/editor-selector'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {getFocusBlock} from './selector.get-focus-block'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * The set of schema member names applicable at the current selection,
 * grouped by category.
 *
 * @beta
 */
export type ApplicableSchema = {
  decorators: ReadonlySet<string>
  annotations: ReadonlySet<string>
  lists: ReadonlySet<string>
  styles: ReadonlySet<string>
  blockObjects: ReadonlySet<string>
  inlineObjects: ReadonlySet<string>
}

/**
 * Resolve which schema members are applicable at the current selection. For
 * each named category (decorators, annotations, lists, styles, block objects,
 * inline objects) returns the set of names that the editor allows at the
 * current selection.
 *
 * Categories split by what they apply to:
 *
 * Text-only (decorators, annotations, lists, styles): require text-block
 * content in the selection. A name is applicable when at least one text
 * block the range covers declares it (union). The underlying operations
 * apply per-block, validating each block's sub-schema and skipping blocks
 * that don't declare the type, so the result reflects "will this produce
 * any effect?" semantics. Selection on a void block, or no selection,
 * returns empty sets.
 *
 * Insertion (blockObjects, inlineObjects): the things consumers might
 * insert AT the current selection. The focus block's sub-schema applies
 * even when the selection is on a void block (the question "what can I
 * insert here?" still has an answer). No selection returns empty sets.
 *
 * Useful for gating toolbar buttons, slash-command items, command palettes,
 * keyboard-shortcut hints and other selection-aware UIs.
 *
 * Pair with `getUnionSchema` (from `@portabletext/editor/traversal`) to render a static toolbar whose
 * buttons stay stable across selection moves while gating their enabled
 * state on whether the corresponding name is in the relevant set.
 *
 * Note for React consumers: the returned object is a fresh value on every
 * call, so subscribing via `useEditorSelector` requires a structural
 * compare to avoid re-rendering on every editor tick. Use
 * {@link compareApplicableSchema} as the third argument.
 *
 * @beta
 */
export const getApplicableSchema: EditorSelector<ApplicableSchema> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return EMPTY
  }

  const focusBlock = getFocusBlock(snapshot)
  const focusSub = focusBlock
    ? getPathSubSchema(snapshot, focusBlock.path)
    : undefined

  const insertion = focusSub
    ? {
        blockObjects: namesOfArray(focusSub.blockObjects),
        inlineObjects: namesOfArray(focusSub.inlineObjects),
      }
    : {blockObjects: EMPTY_SET, inlineObjects: EMPTY_SET}

  const textBlocks = getSelectedTextBlocks(snapshot)

  if (textBlocks.length === 0) {
    return {
      decorators: EMPTY_SET,
      annotations: EMPTY_SET,
      lists: EMPTY_SET,
      styles: EMPTY_SET,
      ...insertion,
    }
  }

  let textApplicable = textCategoryNames(
    getPathSubSchema(snapshot, textBlocks[0]!.path),
  )
  for (let i = 1; i < textBlocks.length; i++) {
    textApplicable = unionTextCategories(
      textApplicable,
      textCategoryNames(getPathSubSchema(snapshot, textBlocks[i]!.path)),
    )
  }

  return {
    ...textApplicable,
    ...insertion,
  }
}

/**
 * Structural comparator for {@link ApplicableSchema} values. Two results
 * compare equal when every category contains the same names (set equality).
 * Pass as the `compare` argument to `useEditorSelector` to keep React
 * subscriptions stable.
 *
 * @beta
 */
export function compareApplicableSchema(
  a: ApplicableSchema,
  b: ApplicableSchema,
): boolean {
  if (a === b) {
    return true
  }
  return (
    sameSet(a.decorators, b.decorators) &&
    sameSet(a.annotations, b.annotations) &&
    sameSet(a.lists, b.lists) &&
    sameSet(a.styles, b.styles) &&
    sameSet(a.blockObjects, b.blockObjects) &&
    sameSet(a.inlineObjects, b.inlineObjects)
  )
}

const EMPTY_SET: ReadonlySet<string> = Object.freeze(new Set<string>())

const EMPTY: ApplicableSchema = Object.freeze({
  decorators: EMPTY_SET,
  annotations: EMPTY_SET,
  lists: EMPTY_SET,
  styles: EMPTY_SET,
  blockObjects: EMPTY_SET,
  inlineObjects: EMPTY_SET,
})

type TextCategoryNames = Pick<
  ApplicableSchema,
  'decorators' | 'annotations' | 'lists' | 'styles'
>

function textCategoryNames(schema: {
  decorators: ReadonlyArray<{name: string}>
  annotations: ReadonlyArray<{name: string}>
  lists: ReadonlyArray<{name: string}>
  styles: ReadonlyArray<{name: string}>
}): TextCategoryNames {
  return {
    decorators: namesOfArray(schema.decorators),
    annotations: namesOfArray(schema.annotations),
    lists: namesOfArray(schema.lists),
    styles: namesOfArray(schema.styles),
  }
}

function unionTextCategories(
  a: TextCategoryNames,
  b: TextCategoryNames,
): TextCategoryNames {
  return {
    decorators: unionSet(a.decorators, b.decorators),
    annotations: unionSet(a.annotations, b.annotations),
    lists: unionSet(a.lists, b.lists),
    styles: unionSet(a.styles, b.styles),
  }
}

function namesOfArray(
  entries: ReadonlyArray<{name: string}>,
): ReadonlySet<string> {
  return new Set(entries.map((entry) => entry.name))
}

function unionSet(a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> {
  const result = new Set<string>(a)
  for (const item of b) {
    result.add(item)
  }
  return result
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (a === b) {
    return true
  }
  if (a.size !== b.size) {
    return false
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false
    }
  }
  return true
}
