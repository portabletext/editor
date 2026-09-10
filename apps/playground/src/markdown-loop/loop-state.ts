import type {PortableTextBlock} from '@portabletext/editor'

export type MarkdownLoopPhase = 'following' | 'editing' | 'conflict'
export type MarkdownLoopChip = 'following' | 'editing' | 'conflict' | 'synced'

export type KeyDelta = {
  freshKeys: ReadonlySet<string>
  freshCount: number
  adoptedCount: number
}

export type MarkdownLoopSnapshot = {
  markdown: string
  value: Array<PortableTextBlock>
}

export type MarkdownLoopState = {
  phase: MarkdownLoopPhase
  chip: MarkdownLoopChip
  ready: boolean
  value: Array<PortableTextBlock>
  markdownText: string
  snapshot: MarkdownLoopSnapshot | null
  degradationNames: ReadonlyArray<string> | null
  keyDelta: KeyDelta | null
  invalidValue: boolean
}

export const initialMarkdownLoopState: MarkdownLoopState = {
  phase: 'following',
  chip: 'following',
  ready: false,
  value: [],
  markdownText: '',
  snapshot: null,
  degradationNames: null,
  keyDelta: null,
  invalidValue: false,
}

export type MarkdownLoopAction =
  | {
      type: 'value ready'
      value: Array<PortableTextBlock>
      markdown: string
    }
  | {
      type: 'mutation'
      value: Array<PortableTextBlock>
      markdown: string
    }
  | {type: 'markdown edited'; text: string}
  | {
      type: 'synced'
      value: Array<PortableTextBlock>
      markdown: string
      keyDelta: KeyDelta
    }
  | {type: 'degraded'; names: ReadonlyArray<string>}
  | {type: 'dismiss degradation'}
  | {type: 'discard'; markdown: string}
  | {type: 'invalid value'}

export function markdownLoopReducer(
  state: MarkdownLoopState,
  action: MarkdownLoopAction,
): MarkdownLoopState {
  switch (action.type) {
    case 'value ready':
      return {
        ...initialMarkdownLoopState,
        ready: true,
        value: action.value,
        markdownText: action.markdown,
      }

    case 'mutation': {
      if (state.phase === 'editing') {
        // A live document change while a read is frozen would overwrite
        // the read on sync, so the loop starts over instead of merging.
        return {
          ...state,
          phase: 'conflict',
          chip: 'conflict',
          value: action.value,
          degradationNames: null,
          keyDelta: null,
        }
      }

      if (state.phase === 'conflict') {
        return {...state, value: action.value}
      }

      return {
        ...state,
        value: action.value,
        markdownText: action.markdown,
        chip: 'following',
        keyDelta: null,
      }
    }

    case 'markdown edited': {
      if (state.phase === 'following') {
        return {
          ...state,
          phase: 'editing',
          chip: 'editing',
          snapshot: {markdown: state.markdownText, value: state.value},
          markdownText: action.text,
          degradationNames: null,
          keyDelta: null,
        }
      }

      // Typing is the fix: a rejected-edit card or a prior sync's key
      // highlights should not survive into the edit that addresses them.
      return {
        ...state,
        markdownText: action.text,
        degradationNames: null,
        keyDelta: null,
      }
    }

    case 'synced':
      return {
        ...state,
        phase: 'following',
        chip: 'synced',
        value: action.value,
        markdownText: action.markdown,
        snapshot: null,
        degradationNames: null,
        keyDelta: action.keyDelta,
        invalidValue: false,
      }

    case 'degraded':
      return {...state, degradationNames: action.names}

    case 'dismiss degradation':
      return {...state, degradationNames: null}

    case 'discard':
      return {
        ...state,
        phase: 'following',
        chip: 'following',
        snapshot: null,
        degradationNames: null,
        keyDelta: null,
        invalidValue: false,
        markdownText: action.markdown,
      }

    case 'invalid value':
      return {...state, invalidValue: true}

    default:
      return state
  }
}
