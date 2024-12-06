import type {KeyedSegment, PortableTextTextBlock} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {TextInsertTextOptions} from 'slate/dist/interfaces/transforms/text'
import type {EditorSelection, PortableTextSlateEditor} from '../../types/editor'
import type {EditorContext} from '../editor-snapshot'

/**
 * @alpha
 */
export type BehaviorEvent =
  | {
      type: 'annotation.add'
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: 'annotation.remove'
      annotation: {
        name: string
      }
    }
  | {
      type: 'annotation.toggle'
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: 'blur'
    }
  | {
      type: 'copy'
      data: DataTransfer
    }
  | {
      type: 'decorator.add'
      decorator: string
    }
  | {
      type: 'decorator.remove'
      decorator: string
    }
  | {
      type: 'decorator.toggle'
      decorator: string
    }
  | {
      type: 'delete.backward'
      unit: TextUnit
    }
  | {
      type: 'delete.forward'
      unit: TextUnit
    }
  | {
      type: 'focus'
    }
  | {
      type: 'insert.block object'
      placement: 'auto' | 'after' | 'before'
      blockObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | {
      type: 'insert.inline object'
      inlineObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | {
      type: 'insert.soft break'
    }
  | {
      type: 'insert.break'
    }
  | {
      type: 'insert.text'
      text: string
      options?: TextInsertTextOptions
    }
  | {
      type: 'paste'
      data: DataTransfer
    }
  | {
      type: 'key.down'
      keyboardEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }
  | {
      type: 'key.up'
      keyboardEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }
  | {
      type: 'list item.toggle'
      listItem: string
    }
  | {
      type: 'style.toggle'
      style: string
    }

/**
 * @alpha
 */
export type BehaviorGuard<
  TBehaviorEvent extends BehaviorEvent,
  TGuardResponse,
> = ({
  context,
  event,
}: {
  context: EditorContext
  event: TBehaviorEvent
}) => TGuardResponse | false

/**
 * @alpha
 */
export type BehaviorActionIntend =
  | BehaviorEvent
  | {
      type: 'insert.span'
      text: string
      annotations?: Array<{
        name: string
        value: {[prop: string]: unknown}
      }>
      decorators?: Array<string>
    }
  | {
      type: 'insert.text block'
      placement: 'auto' | 'after' | 'before'
      textBlock?: {
        children?: PortableTextTextBlock['children']
      }
    }
  | {
      type: 'list item.add'
      listItem: string
    }
  | {
      type: 'list item.remove'
      listItem: string
    }
  | {
      type: 'move.block'
      at: [KeyedSegment]
      to: [KeyedSegment]
    }
  | {
      type: 'move.block down'
      at: [KeyedSegment]
    }
  | {
      type: 'move.block up'
      at: [KeyedSegment]
    }
  | {
      type: 'noop'
    }
  | {
      type: 'delete.block'
      blockPath: [KeyedSegment]
    }
  | {
      type: 'delete.text'
      anchor: BlockOffset
      focus: BlockOffset
    }
  | {
      type: 'effect'
      effect: () => void
    }
  | {
      type: 'select'
      selection: EditorSelection
    }
  | {
      type: 'select previous block'
    }
  | {
      type: 'select next block'
    }
  | {
      type: 'reselect'
    }
  | {
      type: 'style.add'
      style: string
    }
  | {
      type: 'style.remove'
      style: string
    }
  | {
      type: 'text block.set'
      at: [KeyedSegment]
      level?: number
      listItem?: string
      style?: string
    }
  | {
      type: 'text block.unset'
      at: [KeyedSegment]
      props: Array<'level' | 'listItem' | 'style'>
    }

/**
 * @alpha
 */
export type BehaviorAction = BehaviorActionIntend & {
  editor: PortableTextSlateEditor
}

/**
 * @alpha
 */
export type Behavior<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
> = {
  /**
   * The internal editor event that triggers this behavior.
   */
  on: TBehaviorEventType
  /**
   * Predicate function that determines if the behavior should be executed.
   * Returning a non-nullable value from the guard will pass the value to the
   * actions and execute them.
   */
  guard?: BehaviorGuard<
    PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>,
    TGuardResponse
  >
  /**
   * Array of behavior action sets.
   */
  actions: Array<BehaviorActionIntendSet<TGuardResponse>>
}

/**
 * @alpha
 */
export type BehaviorActionIntendSet<TGuardResponse = true> = (
  guardResponse: TGuardResponse,
) => Array<
  OmitFromUnion<
    BehaviorActionIntend,
    'type',
    'copy' | 'key.down' | 'key.up' | 'paste'
  >
>

/**
 * @alpha
 */
export function defineBehavior<
  TBehaviorEventType extends BehaviorEvent['type'],
  TGuardResponse = true,
>(behavior: Behavior<TBehaviorEventType, TGuardResponse>): Behavior {
  return behavior as unknown as Behavior
}

/**
 * @alpha
 */
export type BlockOffset = {
  path: [KeyedSegment]
  offset: number
}

/**
 * @alpha
 */
export type PickFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TPickedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TPickedTags> ? TUnion : never

/**
 * @alpha
 */
export type OmitFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TOmittedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TOmittedTags> ? never : TUnion
