import type {EditorSelection} from '@portabletext/editor'
import type {UseReportPresenceOptions} from '@sanity/sdk-react'
import {describe, expect, it} from 'vitest'

/**
 * The SDK carries a Portable Text selection over the presence wire, and the
 * editor consumes the same shape as a range decoration. This plugin passes
 * values straight through in both directions rather than converting them, so
 * the two types have to stay structurally identical. The two functions below
 * are the whole conversion, and they stop compiling if either side drifts.
 */
type ReportedSelection = UseReportPresenceOptions['selection']

function asEditorSelection(
  reported: NonNullable<ReportedSelection>,
): EditorSelection {
  return reported
}

function asReportedSelection(selection: EditorSelection): ReportedSelection {
  return selection
}

describe('selection compatibility', () => {
  it('passes a reported selection to the editor unchanged', () => {
    const reported = {
      anchor: {
        path: [{_key: 'block-1'}, 'children', {_key: 'span-1'}],
        offset: 3,
      },
      focus: {
        path: [{_key: 'block-1'}, 'children', {_key: 'span-1'}],
        offset: 7,
      },
      backward: false,
    }

    expect(asEditorSelection(reported)).toBe(reported)
  })

  it('passes an editor selection to the wire unchanged, including an empty one', () => {
    expect(asReportedSelection(null)).toBeNull()
  })
})
