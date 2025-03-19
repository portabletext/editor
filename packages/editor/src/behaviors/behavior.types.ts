import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {TextInsertTextOptions} from 'slate/dist/interfaces/transforms/text'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {EventPosition} from '../internal-utils/event-position'
import type {MIMEType} from '../internal-utils/mime-type'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {BlockOffset} from '../types/block-offset'
import type {BlockWithOptionalKey} from '../types/block-with-optional-key'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'

export type BehaviorEventTypeNamespace =
  | 'annotation'
  | 'block'
  | 'blur'
  | 'clipboard'
  | 'custom'
  | 'data transfer'
  | 'decorator'
  | 'delete'
  | 'deserialization'
  | 'deserialize'
  | 'drag'
  | 'focus'
  | 'history'
  | 'input'
  | 'insert'
  | 'keyboard'
  | 'list item'
  | 'mouse'
  | 'move'
  | 'select'
  | 'serialization'
  | 'serialize'
  | 'style'

export type BehaviorEventType<
  TNamespace extends BehaviorEventTypeNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

export type NamespacedBehaviorEventType<
  TNamespace extends BehaviorEventTypeNamespace | '',
> = TNamespace extends ''
  ? BehaviorEvent['type']
  : Extract<BehaviorEvent['type'], TNamespace | `${TNamespace}.${string}`>

/**
 * @beta
 */
export type ExternalBehaviorEvent = {
  type: BehaviorEventType<'insert', 'block object'>
  placement: InsertPlacement
  blockObject: {
    name: string
    value?: {[prop: string]: unknown}
  }
}

/**
 * @beta
 */
export type SyntheticBehaviorEvent =
  | {
      type: BehaviorEventType<'annotation', 'add'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: BehaviorEventType<'annotation', 'remove'>
      annotation: {
        name: string
      }
    }
  | {
      type: BehaviorEventType<'annotation', 'toggle'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: BehaviorEventType<'block', 'set'>
      at: [KeyedSegment]
      props: Record<string, unknown>
    }
  | {
      type: BehaviorEventType<'block', 'unset'>
      at: [KeyedSegment]
      props: Array<string>
    }
  | {
      type: BehaviorEventType<'blur'>
    }
  | {
      type: BehaviorEventType<'data transfer', 'set'>
      data: string
      dataTransfer: DataTransfer
      mimeType: MIMEType
    }
  | {
      type: BehaviorEventType<'decorator', 'add'>
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: BehaviorEventType<'decorator', 'remove'>
      decorator: string
    }
  | {
      type: BehaviorEventType<'decorator', 'toggle'>
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: BehaviorEventType<'delete'>
      selection: NonNullable<EditorSelection>
    }
  | {
      type: BehaviorEventType<'delete', 'backward'>
      unit: TextUnit
    }
  | {
      type: BehaviorEventType<'delete', 'block'>
      at: [KeyedSegment]
    }
  | {
      type: BehaviorEventType<'delete', 'forward'>
      unit: TextUnit
    }
  | {
      type: BehaviorEventType<'delete', 'text'>
      anchor: BlockOffset
      focus: BlockOffset
    }
  | {
      type: BehaviorEventType<'focus'>
    }
  | {
      type: BehaviorEventType<'history', 'redo'>
    }
  | {
      type: BehaviorEventType<'history', 'undo'>
    }
  | {
      type: BehaviorEventType<'insert', 'blocks'>
      blocks: Array<PortableTextBlock>
      placement: InsertPlacement
    }
  | {
      type: BehaviorEventType<'insert', 'inline object'>
      inlineObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | {
      type: BehaviorEventType<'insert', 'break'>
    }
  | {
      type: BehaviorEventType<'insert', 'soft break'>
    }
  | {
      type: BehaviorEventType<'insert', 'block'>
      block: BlockWithOptionalKey
      placement: InsertPlacement
      select?: 'start' | 'end' | 'none'
    }
  | {
      type: BehaviorEventType<'insert', 'span'>
      text: string
      annotations?: Array<{
        name: string
        value: {[prop: string]: unknown}
      }>
      decorators?: Array<string>
    }
  | {
      type: BehaviorEventType<'insert', 'text'>
      text: string
      options?: TextInsertTextOptions
    }
  | {
      type: BehaviorEventType<'list item', 'add'>
      listItem: string
    }
  | {
      type: BehaviorEventType<'list item', 'remove'>
      listItem: string
    }
  | {
      type: BehaviorEventType<'list item', 'toggle'>
      listItem: string
    }
  | {
      type: BehaviorEventType<'move', 'block'>
      at: [KeyedSegment]
      to: [KeyedSegment]
    }
  | {
      type: BehaviorEventType<'move', 'block down'>
      at: [KeyedSegment]
    }
  | {
      type: BehaviorEventType<'move', 'block up'>
      at: [KeyedSegment]
    }
  | {
      type: BehaviorEventType<'select'>
      selection: EditorSelection
    }
  | {
      type: BehaviorEventType<'select', 'previous block'>
      select?: 'start' | 'end'
    }
  | {
      type: BehaviorEventType<'select', 'next block'>
      select?: 'start' | 'end'
    }
  | {
      type: BehaviorEventType<'style', 'add'>
      style: string
    }
  | {
      type: BehaviorEventType<'style', 'remove'>
      style: string
    }
  | {
      type: BehaviorEventType<'style', 'toggle'>
      style: string
    }
  | {
      type: BehaviorEventType<'deserialization', 'success'>
      mimeType: MIMEType
      data: Array<PortableTextBlock>
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: BehaviorEventType<'deserialization', 'failure'>
      mimeType: MIMEType
      reason: string
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: BehaviorEventType<'serialization', 'success'>
      mimeType: MIMEType
      data: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: BehaviorEventType<'serialization', 'failure'>
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
      type: BehaviorEventType<'clipboard', 'copy'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: BehaviorEventType<'clipboard', 'cut'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: BehaviorEventType<'clipboard', 'paste'>
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
      type: BehaviorEventType<'drag', 'dragstart'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: BehaviorEventType<'drag', 'drag'>
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: BehaviorEventType<'drag', 'dragend'>
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: BehaviorEventType<'drag', 'dragenter'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: BehaviorEventType<'drag', 'dragover'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: BehaviorEventType<'drag', 'drop'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: BehaviorEventType<'drag', 'dragleave'>
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
  type: BehaviorEventType<'input', '*'>
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
      type: BehaviorEventType<'keyboard', 'keydown'>
      originEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }
  | {
      type: BehaviorEventType<'keyboard', 'keyup'>
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
      type: BehaviorEventType<'deserialize'>
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: BehaviorEventType<'serialize'>
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }

export type MouseBehaviorEvent = {
  type: BehaviorEventType<'mouse', 'click'>
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
  TInternalType extends BehaviorEventType<'custom', TType> = BehaviorEventType<
    'custom',
    TType
  >,
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

type ResolveBehaviorEvent<
  TBehaviorEventType extends
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'],
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> = TBehaviorEventType extends '*'
  ? BehaviorEvent
  : TBehaviorEventType extends `${infer TNamespace}.*`
    ? TNamespace extends BehaviorEventTypeNamespace
      ? PickFromUnion<
          BehaviorEvent,
          'type',
          NamespacedBehaviorEventType<TNamespace>
        >
      : never
    : TBehaviorEventType extends `custom.${infer TType}`
      ? CustomBehaviorEvent<TPayload, TType>
      : TBehaviorEventType extends BehaviorEvent['type']
        ? PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>
        : never

/**
 * @beta
 */
export type Behavior<
  TBehaviorEventType extends
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'] =
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends
    ResolveBehaviorEvent<TBehaviorEventType> = ResolveBehaviorEvent<TBehaviorEventType>,
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
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'] = CustomBehaviorEvent['type'],
  TGuardResponse = true,
>(
  behavior: Behavior<
    TBehaviorEventType,
    TGuardResponse,
    ResolveBehaviorEvent<TBehaviorEventType, TPayload>
  >,
): Behavior
export function defineBehavior<
  TPayload extends never = never,
  TBehaviorEventType extends
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends ResolveBehaviorEvent<
    TBehaviorEventType,
    TPayload
  > = ResolveBehaviorEvent<TBehaviorEventType, TPayload>,
>(
  behavior: Behavior<TBehaviorEventType, TGuardResponse, TBehaviorEvent>,
): Behavior {
  return behavior as unknown as Behavior
}
