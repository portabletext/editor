import type {BehaviorEvent} from '../behaviors'
import type {EditorSelection} from '../types/editor'
import type {PortableTextChange} from './change-detector'

export type PortableTextChangeMappingResult = {
  events: Array<BehaviorEvent>
  selectionBefore?: {
    blockKey: string
    offset: number
  }
}

export function portableTextChangeToBehaviorEvent(
  change: PortableTextChange,
  cursorOffset?: number,
): PortableTextChangeMappingResult {
  switch (change.type) {
    case 'text.insert': {
      return {
        events: [{type: 'insert.text', text: change.text}],
        selectionBefore: {
          blockKey: change.blockKey,
          offset: change.offset,
        },
      }
    }

    case 'text.delete': {
      const deletionDirection = inferDeletionDirection(change, cursorOffset)

      const deleteSelection: NonNullable<EditorSelection> = {
        anchor: {
          path: [{_key: change.blockKey}],
          offset: change.from,
        },
        focus: {
          path: [{_key: change.blockKey}],
          offset: change.to,
        },
      }

      return {
        events: [
          {
            type: 'delete',
            direction: deletionDirection,
            at: deleteSelection,
          },
        ],
        selectionBefore: {
          blockKey: change.blockKey,
          offset: deletionDirection === 'forward' ? change.from : change.to,
        },
      }
    }

    case 'text.replace': {
      const deleteSelection: NonNullable<EditorSelection> = {
        anchor: {
          path: [{_key: change.blockKey}],
          offset: change.from,
        },
        focus: {
          path: [{_key: change.blockKey}],
          offset: change.to,
        },
      }

      return {
        events: [
          {
            type: 'delete',
            direction: 'backward',
            at: deleteSelection,
          },
          {
            type: 'insert.text',
            text: change.text,
          },
        ],
        selectionBefore: {
          blockKey: change.blockKey,
          offset: change.to,
        },
      }
    }

    // TODO(https://github.com/portabletext/editor/pull/2327): once non-patch
    // compliant Slate operations are removed, `block.split` and `block.merge`
    // need a new mapping strategy — they can't go through `insert.break` /
    // `delete.backward` which rely on those operations internally.
    case 'block.split': {
      return {
        events: [{type: 'insert.break'}],
        selectionBefore: {
          blockKey: change.originalBlockKey,
          offset: change.splitOffset,
        },
      }
    }

    case 'block.merge': {
      return {
        events: [{type: 'delete.backward', unit: 'character'}],
        selectionBefore: {
          blockKey: change.survivingBlockKey,
          offset: change.joinOffset,
        },
      }
    }

    case 'block.insert': {
      return {
        events: [{type: 'insert.break'}],
      }
    }

    case 'block.delete': {
      return {
        events: [{type: 'delete.block', at: [{_key: change.blockKey}]}],
      }
    }

    case 'noop':
      return {events: []}
  }
}

function inferDeletionDirection(
  change: {from: number; to: number},
  cursorOffset?: number,
): 'backward' | 'forward' {
  if (cursorOffset === undefined) {
    // Backspace is the overwhelmingly common case, especially on mobile
    // where the Delete key doesn't exist.
    return 'backward'
  }

  if (cursorOffset <= change.from) {
    return 'forward'
  }

  return 'backward'
}
