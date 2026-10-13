import type {DiffMatchPatch, Patch} from '@portabletext/patches'
import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  adjustIndiciesToUcs2,
  makePatches,
  parsePatch,
  stringifyPatches,
  type Diff,
} from '@sanity/diff-match-patch'

/**
 * Text inserted or deleted at an offset, in the text as the edits before it
 * left it.
 */
export type TextEdit = {type: 'insert' | 'delete'; offset: number; text: string}

/**
 * A `diffMatchPatch` that deletes `deleteLength` characters at `offset` and
 * inserts `insertText` there. Unlike a patch computed from the text before
 * and after, it keeps the position: deleting the first `foo` of `foofoo`
 * says so.
 */
export function textEditPatch(
  text: string,
  edit: {offset: number; deleteLength?: number; insertText?: string},
  path: Patch['path'],
): DiffMatchPatch {
  const end = edit.offset + (edit.deleteLength ?? 0)
  const diffs: Array<Diff> = [
    [DIFF_EQUAL, text.slice(0, edit.offset)],
    [DIFF_DELETE, text.slice(edit.offset, end)],
    [DIFF_INSERT, edit.insertText ?? ''],
    [DIFF_EQUAL, text.slice(end)],
  ]

  return {
    type: 'diffMatchPatch',
    path,
    value: stringifyPatches(
      makePatches(
        text,
        diffs.filter(([, diffText]) => diffText !== ''),
      ),
    ),
  }
}

/**
 * The insertions and deletions a `diffMatchPatch` value makes to `text`, at
 * the positions the patch names.
 */
export function textEditsOf(value: string, text: string): Array<TextEdit> {
  const edits: Array<TextEdit> = []

  for (const hunk of adjustIndiciesToUcs2(parsePatch(value), text)) {
    let offset = hunk.start2

    for (const [operation, diffText] of hunk.diffs) {
      if (operation === DIFF_EQUAL) {
        offset += diffText.length
      } else if (operation === DIFF_INSERT) {
        edits.push({type: 'insert', offset, text: diffText})
        offset += diffText.length
      } else {
        edits.push({type: 'delete', offset, text: diffText})
      }
    }
  }

  return edits
}

/**
 * Where an offset lands after the edits. Text inserted at the offset goes
 * before it, and an offset inside deleted text goes to the deletion's start.
 */
export function mapOffsetThrough(
  offset: number,
  edits: Array<TextEdit>,
): number {
  let mapped = offset

  for (const edit of edits) {
    if (edit.type === 'insert') {
      if (edit.offset <= mapped) {
        mapped += edit.text.length
      }
    } else if (edit.offset + edit.text.length <= mapped) {
      mapped -= edit.text.length
    } else if (edit.offset < mapped) {
      mapped = edit.offset
    }
  }

  return mapped
}
