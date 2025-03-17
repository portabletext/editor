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
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
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
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    })
  | {
      type: 'serialization.success'
      mimeType: MIMEType
      data: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: 'serialization.failure'
      mimeType: MIMEType
      reason: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }

export type InsertPlacement = 'auto' | 'after' | 'before'

type ClipboardBehaviorEvent =
  | {
      type: 'clipboard.copy'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: 'clipboard.cut'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: 'clipboard.paste'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }

export function isClipboardBehaviorEvent(
  event: BehaviorEvent,
): event is ClipboardBehaviorEvent {
  return event.type.startsWith('clipboard.')
}

type DragBehaviorEvent =
  | {
      type: 'drag.dragstart'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: 'drag.drag'
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: 'drag.dragend'
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: 'drag.dragenter'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: 'drag.dragover'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: 'drag.drop'
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: 'drag.dragleave'
      originEvent: {
        dataTransfer: DataTransfer
      }
    }

export function isDragBehaviorEvent(
  event: BehaviorEvent,
): event is DragBehaviorEvent {
  return event.type.startsWith('drag.')
}

/**
 * Used to represent native InputEvents that hold a DataTransfer object.
 *
 * These can either be one of:
 *
 * - insertFromPaste
 * - insertFromPasteAsQuotation
 * - insertFromDrop
 * - insertReplacementText
 * - insertFromYank
 */
export type InputBehaviorEvent = {
  type: 'input.*'
  originEvent: {
    dataTransfer: DataTransfer
  }
}

export function isInputBehaviorEvent(
  event: BehaviorEvent,
): event is InputBehaviorEvent {
  return event.type.startsWith('input.')
}

export type KeyboardBehaviorEvent =
  | {
      type: 'keyboard.keydown'
      originEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }
  | {
      type: 'keyboard.keyup'
      originEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }

export function isKeyboardBehaviorEvent(
  event: BehaviorEvent,
): event is KeyboardBehaviorEvent {
  return event.type.startsWith('keyboard.')
}

export type DataBehaviorEvent =
  | {
      type: 'deserialize'
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: 'serialize'
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
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
  | ClipboardBehaviorEvent
  | DragBehaviorEvent
  | InputBehaviorEvent
  | KeyboardBehaviorEvent
  | MouseBehaviorEvent

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
  | {type: 'clipboard.*'}
  | {type: 'drag.*'}
  | {type: 'input.*'}
  | {type: 'keyboard.*'}
  | {type: 'mouse.*'}

/**
 * @beta
 */
export type Behavior<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends BehaviorEvent = TBehaviorEventType extends '*'
    ? BehaviorEvent
    : TBehaviorEventType extends 'clipboard.*'
      ? ClipboardBehaviorEvent
      : TBehaviorEventType extends 'drag.*'
        ? DragBehaviorEvent
        : TBehaviorEventType extends 'input.*'
          ? InputBehaviorEvent
          : TBehaviorEventType extends 'keyboard.*'
            ? KeyboardBehaviorEvent
            : TBehaviorEventType extends 'mouse.*'
              ? MouseBehaviorEvent
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
        : TBehaviorEventType extends `clipboard.*`
          ? ClipboardBehaviorEvent
          : TBehaviorEventType extends `drag.*`
            ? DragBehaviorEvent
            : TBehaviorEventType extends 'input.*'
              ? InputBehaviorEvent
              : TBehaviorEventType extends 'keyboard.*'
                ? KeyboardBehaviorEvent
                : TBehaviorEventType extends 'mouse.*'
                  ? MouseBehaviorEvent
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
      : TBehaviorEventType extends `clipboard.*`
        ? ClipboardBehaviorEvent
        : TBehaviorEventType extends `drag.*`
          ? DragBehaviorEvent
          : TBehaviorEventType extends 'input.*'
            ? InputBehaviorEvent
            : TBehaviorEventType extends 'keyboard.*'
              ? KeyboardBehaviorEvent
              : TBehaviorEventType extends 'mouse.*'
                ? MouseBehaviorEvent
                : PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>,
>(
  behavior: Behavior<TBehaviorEventType, TGuardResponse, TBehaviorEvent>,
): Behavior {
  return behavior as unknown as Behavior
}
