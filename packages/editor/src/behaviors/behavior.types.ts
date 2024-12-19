import type {KeyedSegment, PortableTextTextBlock} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {TextInsertTextOptions} from 'slate/dist/interfaces/transforms/text'
import type {EditorContext} from '../editor/editor-snapshot'
import type {PickFromUnion} from '../type-utils'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'

/**
 * @beta
 */
export type SyntheticBehaviorEvent =
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
      type: 'insert.break'
    }
  | {
      type: 'insert.soft break'
    }
  | {
      type: 'insert.text'
      text: string
      options?: TextInsertTextOptions
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
 * @beta
 */
export type NativeBehaviorEvent =
  | {
      type: 'copy'
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
      type: 'paste'
      data: DataTransfer
    }

/**
 * @beta
 */
export type BehaviorActionIntend =
  | SyntheticBehaviorEvent
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
      type: 'reselect'
    }
  | {
      type: 'select'
      selection: EditorSelection
    }
  | {
      type: 'select.previous block'
    }
  | {
      type: 'select.next block'
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
 * @beta
 */
export type BehaviorAction = BehaviorActionIntend & {
  editor: PortableTextSlateEditor
}

/**
 * @beta
 */
export type BehaviorEvent = SyntheticBehaviorEvent | NativeBehaviorEvent

/**
 * @beta
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
  actions: Array<BehaviorActionIntendSet<TBehaviorEventType, TGuardResponse>>
}

/**
 * @beta
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
 * @beta
 */
export type BehaviorActionIntendSet<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
> = (
  {
    context,
    event,
  }: {
    context: EditorContext
    event: PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorActionIntend>

/**
 * @beta
 */
export function defineBehavior<
  TAnyBehaviorEventType extends BehaviorEvent['type'],
  TGuardResponse = true,
>(behavior: Behavior<TAnyBehaviorEventType, TGuardResponse>): Behavior {
  return behavior as unknown as Behavior
}

/**
 * @beta
 */
export type BlockOffset = {
  path: [KeyedSegment]
  offset: number
}
