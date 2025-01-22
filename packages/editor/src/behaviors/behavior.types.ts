import type {
  KeyedSegment,
  PortableTextBlock,
  PortableTextTextBlock,
} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {TextInsertTextOptions} from 'slate/dist/interfaces/transforms/text'
import type {ConverterEvent} from '../converters/converter'
import type {EditorContext} from '../editor/editor-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
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
      type: 'blur'
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
      type: 'insert.blocks'
      blocks: Array<PortableTextBlock>
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
      type: 'select'
      selection: EditorSelection
    }
  | {
      type: 'style.toggle'
      style: string
    }
  | (PickFromUnion<
      ConverterEvent,
      'type',
      | 'deserialization.failure'
      | 'deserialization.success'
      | 'serialization.failure'
      | 'serialization.success'
    > & {dataTransfer: DataTransfer})

/**
 * @beta
 */
export type NativeBehaviorEvent =
  | {
      type: 'copy'
      data: DataTransfer
    }
  | {
      type: 'deserialize'
      dataTransfer: DataTransfer
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
  | {
      type: 'serialize'
      originEvent: 'copy' | 'cut' | 'drag' | 'unknown'
      dataTransfer: DataTransfer
    }

/**
 * @beta
 */
export type CustomBehaviorEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string,
  TInternalType extends `custom.${TType}` = `custom.${TType}`,
> = {
  type: TInternalType
} & TPayload

export function isCustomBehaviorEvent(
  event: BehaviorEvent,
): event is CustomBehaviorEvent {
  return event.type.startsWith('custom.')
}

/**
 * @beta
 */
export type BehaviorActionIntend =
  | SyntheticBehaviorEvent
  | {
      type: 'raise'
      event: SyntheticBehaviorEvent | CustomBehaviorEvent
    }
  | {
      type: 'annotation.toggle'
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
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
export type BehaviorAction = OmitFromUnion<
  BehaviorActionIntend,
  'type',
  'raise'
> & {
  editor: PortableTextSlateEditor
}

/**
 * @beta
 */
export function raise(
  event: SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorActionIntend, 'type', 'raise'> {
  return {type: 'raise', event}
}

/**
 * @beta
 */
export type BehaviorEvent =
  | SyntheticBehaviorEvent
  | NativeBehaviorEvent
  | CustomBehaviorEvent

/**
 * @beta
 */
export type Behavior<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends BehaviorEvent = PickFromUnion<
    BehaviorEvent,
    'type',
    TBehaviorEventType
  >,
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
  guard?: BehaviorGuard<TBehaviorEvent, TGuardResponse>
  /**
   * Array of behavior action sets.
   */
  actions: Array<BehaviorActionIntendSet<TBehaviorEvent, TGuardResponse>>
}

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = ({
  context,
  event,
}: {
  context: EditorContext
  event: TBehaviorEvent
}) => TGuardResponse | false

/**
 * @beta
 */
export type BehaviorActionIntendSet<TBehaviorEvent, TGuardResponse> = (
  {
    context,
    event,
  }: {
    context: EditorContext
    event: TBehaviorEvent
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorActionIntend>

/**
 * @beta
 *
 * @example
 *
 * ```tsx
 * const noLowerCaseA = defineBehavior({
 *   on: 'insert.text',
 *   guard: ({event, context}) => event.text === 'a',
 *   actions: [({event, context}) => [{type: 'insert.text', text: 'A'}]],
 * })
 * ```
 *
 *
 *
 *
 *
 */
export function defineBehavior<
  TPayload extends Record<string, unknown>,
  TBehaviorEventType extends
    BehaviorEvent['type'] = CustomBehaviorEvent['type'],
  TGuardResponse = true,
>(
  behavior: Behavior<
    TBehaviorEventType,
    TGuardResponse,
    TBehaviorEventType extends `custom.${infer TType}`
      ? CustomBehaviorEvent<TPayload, TType>
      : PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>
  >,
): Behavior
export function defineBehavior<
  TPayload extends never = never,
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends
    BehaviorEvent = TBehaviorEventType extends `custom.${infer TType}`
    ? CustomBehaviorEvent<TPayload, TType>
    : PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>,
>(
  behavior: Behavior<TBehaviorEventType, TGuardResponse, TBehaviorEvent>,
): Behavior {
  return behavior as unknown as Behavior
}

/**
 * @beta
 */
export type BlockOffset = {
  path: [KeyedSegment]
  offset: number
}
