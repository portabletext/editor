import type {
  KeyedSegment,
  PortableTextBlock,
  PortableTextTextBlock,
} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {TextInsertTextOptions} from 'slate/dist/interfaces/transforms/text'
import type {ConverterEvent} from '../converters/converter.types'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {EventPosition} from '../internal-utils/event-position'
import type {MIMEType} from '../internal-utils/mime-type'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {BlockOffset} from '../types/block-offset'
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
      type: 'block.set'
      at: [KeyedSegment]
      props: Record<string, unknown>
    }
  | {
      type: 'block.unset'
      at: [KeyedSegment]
      props: Array<string>
    }
  | {
      type: 'blur'
    }
  | {
      type: 'data transfer.set'
      data: string
      dataTransfer: DataTransfer
      mimeType: MIMEType
    }
  | {
      type: 'decorator.add'
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
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
      type: 'delete'
      selection: NonNullable<EditorSelection>
    }
  | {
      type: 'delete.backward'
      unit: TextUnit
    }
  | {
      type: 'delete.block'
      blockPath: [KeyedSegment]
    }
  | {
      type: 'delete.forward'
      unit: TextUnit
    }
  | {
      type: 'delete.text'
      anchor: BlockOffset
      focus: BlockOffset
    }
  | {
      type: 'focus'
    }
  | {
      type: 'history.redo'
    }
  | {
      type: 'history.undo'
    }
  | {
      type: 'insert.blocks'
      blocks: Array<PortableTextBlock>
      placement: InsertPlacement
    }
  | {
      type: 'insert.block object'
      placement: InsertPlacement
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
      type: 'insert.block'
      block: PortableTextBlock
      placement: InsertPlacement
      select?: 'start' | 'end' | 'none'
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
      type: 'insert.text'
      text: string
      options?: TextInsertTextOptions
    }
  | {
      type: 'insert.text block'
      placement: InsertPlacement
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
      type: 'list item.toggle'
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
      type: 'select'
      selection: EditorSelection
    }
  | {
      type: 'select.previous block'
      select?: 'start' | 'end'
    }
  | {
      type: 'select.next block'
      select?: 'start' | 'end'
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
      type: 'style.toggle'
      style: string
    }
  | (PickFromUnion<
      ConverterEvent,
      'type',
      'deserialization.failure' | 'deserialization.success'
    > & {
      dataTransfer: DataTransfer
      originEvent: Omit<
        PickFromUnion<NativeBehaviorEvent, 'type', 'drag.drop' | 'paste'>,
        'dataTransfer'
      >
    })
  | {
      type: 'serialization.success'
      mimeType: MIMEType
      data: string
      dataTransfer: DataTransfer
      originEvent: Omit<
        PickFromUnion<
          NativeBehaviorEvent,
          'type',
          'copy' | 'cut' | 'drag.dragstart'
        >,
        'dataTransfer'
      >
    }
  | {
      type: 'serialization.failure'
      mimeType: MIMEType
      reason: string
      dataTransfer: DataTransfer
      originEvent: Omit<
        PickFromUnion<
          NativeBehaviorEvent,
          'type',
          'copy' | 'cut' | 'drag.dragstart'
        >,
        'dataTransfer'
      >
    }

export type InsertPlacement = 'auto' | 'after' | 'before'

type DragBehaviorEvent =
  | {
      type: 'drag.dragstart'
      dataTransfer: DataTransfer
      position: EventPosition
    }
  | {
      type: 'drag.drag'
      dataTransfer: DataTransfer
    }
  | {
      type: 'drag.dragend'
      dataTransfer: DataTransfer
    }
  | {
      type: 'drag.dragenter'
      dataTransfer: DataTransfer
      position: EventPosition
    }
  | {
      type: 'drag.dragover'
      dataTransfer: DataTransfer
      position: EventPosition
    }
  | {
      type: 'drag.drop'
      dataTransfer: DataTransfer
      position: EventPosition
    }
  | {
      type: 'drag.dragleave'
      dataTransfer: DataTransfer
    }

export function isDragBehaviorEvent(
  event: BehaviorEvent,
): event is DragBehaviorEvent {
  return event.type.startsWith('drag.')
}

export type DataBehaviorEvent =
  | {
      type: 'deserialize'
      dataTransfer: DataTransfer
      originEvent: Omit<
        PickFromUnion<NativeBehaviorEvent, 'type', 'drag.drop' | 'paste'>,
        'dataTransfer'
      >
    }
  | {
      type: 'serialize'
      dataTransfer: DataTransfer
      originEvent: Omit<
        PickFromUnion<
          NativeBehaviorEvent,
          'type',
          'copy' | 'cut' | 'drag.dragstart'
        >,
        'dataTransfer'
      >
    }

export type MouseBehaviorEvent = {
  type: 'mouse.click'
  position: EventPosition
}

export function isMouseBehaviorEvent(
  event: BehaviorEvent,
): event is MouseBehaviorEvent {
  return event.type.startsWith('mouse.')
}

/**
 * @beta
 */
export type NativeBehaviorEvent =
  | {
      type: 'copy'
      data: DataTransfer
      position: EventPosition
    }
  | {
      type: 'cut'
      dataTransfer: DataTransfer
      position: EventPosition
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
  | MouseBehaviorEvent
  | {
      type: 'paste'
      data: DataTransfer
      position: EventPosition
    }
  | DragBehaviorEvent

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
export type BehaviorAction =
  | SyntheticBehaviorEvent
  | {
      type: 'raise'
      event: DataBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent
    }
  | {
      type: 'noop'
    }
  | {
      type: 'effect'
      effect: () => void
    }

export type InternalBehaviorAction = OmitFromUnion<
  BehaviorAction,
  'type',
  'raise'
> & {
  editor: PortableTextSlateEditor
}

/**
 * @beta
 */
export function raise(
  event: DataBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'raise'> {
  return {type: 'raise', event}
}

/**
 * @beta
 */
export type BehaviorEvent =
  | SyntheticBehaviorEvent
  | DataBehaviorEvent
  | NativeBehaviorEvent
  | CustomBehaviorEvent
  | {type: '*'}
  | {type: 'drag.*'}

/**
 * @beta
 */
export type Behavior<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends BehaviorEvent = TBehaviorEventType extends '*'
    ? BehaviorEvent
    : TBehaviorEventType extends 'drag.*'
      ? DragBehaviorEvent
      : PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>,
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
  actions: Array<BehaviorActionSet<TBehaviorEvent, TGuardResponse>>
}

/**
 * @beta
 */
export type BehaviorGuard<TBehaviorEvent, TGuardResponse> = (payload: {
  /**
   * @deprecated
   * Use `snapshot` instead
   */
  context: EditorContext
  snapshot: EditorSnapshot
  event: TBehaviorEvent
}) => TGuardResponse | false

/**
 * @beta
 */
export type BehaviorActionSet<TBehaviorEvent, TGuardResponse> = (
  payload: {
    /**
     * @deprecated
     * Use `snapshot` instead
     */
    context: EditorContext
    snapshot: EditorSnapshot
    event: TBehaviorEvent
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorAction>

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
      : TBehaviorEventType extends '*'
        ? OmitFromUnion<BehaviorEvent, 'type', '*'>
        : TBehaviorEventType extends `drag.*`
          ? DragBehaviorEvent
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
    : TBehaviorEventType extends '*'
      ? OmitFromUnion<BehaviorEvent, 'type', '*'>
      : TBehaviorEventType extends `drag.*`
        ? DragBehaviorEvent
        : PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>,
>(
  behavior: Behavior<TBehaviorEventType, TGuardResponse, TBehaviorEvent>,
): Behavior {
  return behavior as unknown as Behavior
}
