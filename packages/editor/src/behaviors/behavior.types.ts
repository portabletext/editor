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

/**
 * @beta
 */
export type BehaviorEvent =
  | SyntheticBehaviorEvent
  | InternalBehaviorEvent
  | NativeBehaviorEvent
  | CustomBehaviorEvent

type BehaviorEventTypeNamespace =
  | SyntheticBehaviorEventNamespace
  | InternalBehaviorEventNamespace
  | NativeBehaviorEventNamespace
  | CustomBehaviorEventNamespace

type SyntheticBehaviorEventType<
  TNamespace extends SyntheticBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

type InternalBehaviorEventType<
  TNamespace extends InternalBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

type NativeBehaviorEventType<
  TNamespace extends NativeBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

type CustomBehaviorEventType<
  TNamespace extends CustomBehaviorEventNamespace,
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
export type ExternalSyntheticBehaviorEvent = {
  type: SyntheticBehaviorEventType<'insert', 'block object'>
  placement: InsertPlacement
  blockObject: {
    name: string
    value?: {[prop: string]: unknown}
  }
}

/**************************************
 * Synthetic events
 **************************************/

type SyntheticBehaviorEventNamespace =
  | 'annotation'
  | 'block'
  | 'blur'
  | 'data transfer'
  | 'decorator'
  | 'delete'
  | 'deserialization'
  | 'focus'
  | 'history'
  | 'insert'
  | 'list item'
  | 'move'
  | 'select'
  | 'serialization'
  | 'style'

/**
 * @beta
 */
export type SyntheticBehaviorEvent =
  | {
      type: SyntheticBehaviorEventType<'annotation', 'add'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: SyntheticBehaviorEventType<'annotation', 'remove'>
      annotation: {
        name: string
      }
    }
  | {
      type: SyntheticBehaviorEventType<'annotation', 'toggle'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: SyntheticBehaviorEventType<'block', 'set'>
      at: [KeyedSegment]
      props: Record<string, unknown>
    }
  | {
      type: SyntheticBehaviorEventType<'block', 'unset'>
      at: [KeyedSegment]
      props: Array<string>
    }
  | {
      type: SyntheticBehaviorEventType<'blur'>
    }
  | {
      type: SyntheticBehaviorEventType<'data transfer', 'set'>
      data: string
      dataTransfer: DataTransfer
      mimeType: MIMEType
    }
  | {
      type: SyntheticBehaviorEventType<'decorator', 'add'>
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: SyntheticBehaviorEventType<'decorator', 'remove'>
      decorator: string
    }
  | {
      type: SyntheticBehaviorEventType<'decorator', 'toggle'>
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: SyntheticBehaviorEventType<'delete'>
      selection: NonNullable<EditorSelection>
    }
  | {
      type: SyntheticBehaviorEventType<'delete', 'backward'>
      unit: TextUnit
    }
  | {
      type: SyntheticBehaviorEventType<'delete', 'block'>
      at: [KeyedSegment]
    }
  | {
      type: SyntheticBehaviorEventType<'delete', 'forward'>
      unit: TextUnit
    }
  | {
      type: SyntheticBehaviorEventType<'delete', 'text'>
      anchor: BlockOffset
      focus: BlockOffset
    }
  | {
      type: SyntheticBehaviorEventType<'focus'>
    }
  | {
      type: SyntheticBehaviorEventType<'history', 'redo'>
    }
  | {
      type: SyntheticBehaviorEventType<'history', 'undo'>
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'blocks'>
      blocks: Array<PortableTextBlock>
      placement: InsertPlacement
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'inline object'>
      inlineObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'break'>
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'soft break'>
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'block'>
      block: BlockWithOptionalKey
      placement: InsertPlacement
      select?: 'start' | 'end' | 'none'
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'span'>
      text: string
      annotations?: Array<{
        name: string
        value: {[prop: string]: unknown}
      }>
      decorators?: Array<string>
    }
  | {
      type: SyntheticBehaviorEventType<'insert', 'text'>
      text: string
      options?: TextInsertTextOptions
    }
  | {
      type: SyntheticBehaviorEventType<'list item', 'add'>
      listItem: string
    }
  | {
      type: SyntheticBehaviorEventType<'list item', 'remove'>
      listItem: string
    }
  | {
      type: SyntheticBehaviorEventType<'list item', 'toggle'>
      listItem: string
    }
  | {
      type: SyntheticBehaviorEventType<'move', 'block'>
      at: [KeyedSegment]
      to: [KeyedSegment]
    }
  | {
      type: SyntheticBehaviorEventType<'move', 'block down'>
      at: [KeyedSegment]
    }
  | {
      type: SyntheticBehaviorEventType<'move', 'block up'>
      at: [KeyedSegment]
    }
  | {
      type: SyntheticBehaviorEventType<'select'>
      selection: EditorSelection
    }
  | {
      type: SyntheticBehaviorEventType<'select', 'previous block'>
      select?: 'start' | 'end'
    }
  | {
      type: SyntheticBehaviorEventType<'select', 'next block'>
      select?: 'start' | 'end'
    }
  | {
      type: SyntheticBehaviorEventType<'style', 'add'>
      style: string
    }
  | {
      type: SyntheticBehaviorEventType<'style', 'remove'>
      style: string
    }
  | {
      type: SyntheticBehaviorEventType<'style', 'toggle'>
      style: string
    }
  | {
      type: SyntheticBehaviorEventType<'deserialization', 'success'>
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
      type: SyntheticBehaviorEventType<'deserialization', 'failure'>
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
      type: SyntheticBehaviorEventType<'serialization', 'success'>
      mimeType: MIMEType
      data: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: SyntheticBehaviorEventType<'serialization', 'failure'>
      mimeType: MIMEType
      reason: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }

export type InsertPlacement = 'auto' | 'after' | 'before'

/**************************************
 * Native events
 **************************************/

type NativeBehaviorEventNamespace =
  | 'clipboard'
  | 'drag'
  | 'input'
  | 'keyboard'
  | 'mouse'

/**
 * @beta
 */
export type NativeBehaviorEvent =
  | ClipboardBehaviorEvent
  | DragBehaviorEvent
  | InputBehaviorEvent
  | KeyboardBehaviorEvent
  | MouseBehaviorEvent

type ClipboardBehaviorEvent =
  | {
      type: NativeBehaviorEventType<'clipboard', 'copy'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: NativeBehaviorEventType<'clipboard', 'cut'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: NativeBehaviorEventType<'clipboard', 'paste'>
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
      type: NativeBehaviorEventType<'drag', 'dragstart'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: NativeBehaviorEventType<'drag', 'drag'>
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: NativeBehaviorEventType<'drag', 'dragend'>
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: NativeBehaviorEventType<'drag', 'dragenter'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: NativeBehaviorEventType<'drag', 'dragover'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: NativeBehaviorEventType<'drag', 'drop'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: NativeBehaviorEventType<'drag', 'dragleave'>
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
  type: NativeBehaviorEventType<'input', '*'>
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
      type: NativeBehaviorEventType<'keyboard', 'keydown'>
      originEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }
  | {
      type: NativeBehaviorEventType<'keyboard', 'keyup'>
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

export type InternalBehaviorEvent =
  | {
      type: InternalBehaviorEventType<'deserialize'>
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: InternalBehaviorEventType<'serialize'>
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }

export type MouseBehaviorEvent = {
  type: NativeBehaviorEventType<'mouse', 'click'>
  position: EventPosition
}

export function isMouseBehaviorEvent(
  event: BehaviorEvent,
): event is MouseBehaviorEvent {
  return event.type.startsWith('mouse.')
}

/**************************************
 * Custom events
 **************************************/

type CustomBehaviorEventNamespace = 'custom'

/**
 * @beta
 */
export type CustomBehaviorEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
  TType extends string = string,
  TInternalType extends CustomBehaviorEventType<
    'custom',
    TType
  > = CustomBehaviorEventType<'custom', TType>,
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
      event:
        | InternalBehaviorEvent
        | SyntheticBehaviorEvent
        | CustomBehaviorEvent
    }
  | {
      type: 'noop'
    }
  | {
      type: 'effect'
      effect: () => void
    }

/**************************************
 * Internal events
 **************************************/

type InternalBehaviorEventNamespace = 'deserialize' | 'serialize'

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
  event: InternalBehaviorEvent | SyntheticBehaviorEvent | CustomBehaviorEvent,
): PickFromUnion<BehaviorAction, 'type', 'raise'> {
  return {type: 'raise', event}
}

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
