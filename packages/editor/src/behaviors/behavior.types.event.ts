import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {EventPosition} from '../internal-utils/event-position'
import type {MIMEType} from '../internal-utils/mime-type'
import type {PickFromUnion} from '../type-utils'
import type {BlockOffset} from '../types/block-offset'
import type {BlockWithOptionalKey} from '../types/block-with-optional-key'
import type {EditorSelection} from '../types/editor'

/**
 * @beta
 */
export type BehaviorEvent =
  | SyntheticBehaviorEvent
  | InternalBehaviorEvent
  | NativeBehaviorEvent
  | CustomBehaviorEvent

export type BehaviorEventTypeNamespace =
  | SyntheticBehaviorEventNamespace
  | InternalBehaviorEventNamespace
  | NativeBehaviorEventNamespace
  | CustomBehaviorEventNamespace

type NamespacedBehaviorEventType<
  TNamespace extends BehaviorEventTypeNamespace | '',
> = TNamespace extends ''
  ? BehaviorEvent['type']
  : Extract<BehaviorEvent['type'], TNamespace | `${TNamespace}.${string}`>

/**************************************
 * External events
 **************************************/

type ExternalBehaviorEventNamespace = 'insert'

type ExternalBehaviorEventType<
  TNamespace extends ExternalBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

export type ExternalBehaviorEvent =
  | {
      type: ExternalBehaviorEventType<'insert', 'block object'>
      placement: InsertPlacement
      blockObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | PickFromUnion<
      InternalBehaviorEvent,
      'type',
      | 'annotation.toggle'
      | 'decorator.toggle'
      | 'insert.blocks'
      | 'list item.add'
      | 'list item.remove'
      | 'list item.toggle'
      | 'style.add'
      | 'style.remove'
      | 'style.toggle'
    >

/**************************************
 * Synthetic events
 **************************************/

type SyntheticBehaviorEventType<
  TNamespace extends SyntheticBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

type SyntheticBehaviorEventNamespace =
  | 'annotation'
  | 'block'
  | 'blur'
  | 'decorator'
  | 'delete'
  | 'focus'
  | 'history'
  | 'insert'
  | 'move'
  | 'select'

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
      type: SyntheticBehaviorEventType<'decorator', 'add'>
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: SyntheticBehaviorEventType<'decorator', 'remove'>
      decorator: string
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

export type InsertPlacement = 'auto' | 'after' | 'before'

export function isKeyboardBehaviorEvent(
  event: BehaviorEvent,
): event is KeyboardBehaviorEvent {
  return event.type.startsWith('keyboard.')
}

/**************************************
 * Internal events
 **************************************/

type InternalBehaviorEventNamespace =
  | 'annotation'
  | 'decorator'
  | 'deserialize'
  | 'deserialization'
  | 'list item'
  | 'insert'
  | 'select'
  | 'serialize'
  | 'serialization'
  | 'style'

type InternalBehaviorEventType<
  TNamespace extends InternalBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

export type InternalBehaviorEvent =
  | {
      type: InternalBehaviorEventType<'annotation', 'toggle'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: InternalBehaviorEventType<'decorator', 'toggle'>
      decorator: string
      offsets?: {anchor: BlockOffset; focus: BlockOffset}
    }
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
  | {
      type: InternalBehaviorEventType<'deserialization', 'success'>
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
      type: InternalBehaviorEventType<'deserialization', 'failure'>
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
      type: InternalBehaviorEventType<'serialization', 'success'>
      mimeType: MIMEType
      data: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: InternalBehaviorEventType<'serialization', 'failure'>
      mimeType: MIMEType
      reason: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: InternalBehaviorEventType<'insert', 'blocks'>
      blocks: Array<PortableTextBlock>
      placement: InsertPlacement
    }
  | {
      type: InternalBehaviorEventType<'list item', 'add'>
      listItem: string
    }
  | {
      type: InternalBehaviorEventType<'list item', 'remove'>
      listItem: string
    }
  | {
      type: InternalBehaviorEventType<'list item', 'toggle'>
      listItem: string
    }
  | {
      type: InternalBehaviorEventType<'select', 'previous block'>
      select?: 'start' | 'end'
    }
  | {
      type: InternalBehaviorEventType<'select', 'next block'>
      select?: 'start' | 'end'
    }
  | {
      type: InternalBehaviorEventType<'style', 'add'>
      style: string
    }
  | {
      type: InternalBehaviorEventType<'style', 'remove'>
      style: string
    }
  | {
      type: InternalBehaviorEventType<'style', 'toggle'>
      style: string
    }

export function isInternalBehaviorEvent(
  event: BehaviorEvent,
): event is InternalBehaviorEvent {
  return (
    event.type === 'deserialize' ||
    event.type.startsWith('deserialization.') ||
    event.type === 'insert.blocks' ||
    event.type.startsWith('list item.') ||
    event.type === 'serialize' ||
    event.type.startsWith('serialization.') ||
    event.type === 'select.next block' ||
    event.type === 'select.previous block' ||
    event.type.startsWith('style.')
  )
}

/**************************************
 * Native events
 **************************************/

type NativeBehaviorEventNamespace =
  | 'clipboard'
  | 'drag'
  | 'input'
  | 'keyboard'
  | 'mouse'

type NativeBehaviorEventType<
  TNamespace extends NativeBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

export function isNativeBehaviorEvent(
  event: BehaviorEvent,
): event is NativeBehaviorEvent {
  return (
    isClipboardBehaviorEvent(event) ||
    isDragBehaviorEvent(event) ||
    isInputBehaviorEvent(event) ||
    isKeyboardBehaviorEvent(event) ||
    isMouseBehaviorEvent(event)
  )
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

function isClipboardBehaviorEvent(
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

function isDragBehaviorEvent(event: BehaviorEvent): event is DragBehaviorEvent {
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

function isInputBehaviorEvent(
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

export type MouseBehaviorEvent = {
  type: NativeBehaviorEventType<'mouse', 'click'>
  position: EventPosition
}

function isMouseBehaviorEvent(
  event: BehaviorEvent,
): event is MouseBehaviorEvent {
  return event.type.startsWith('mouse.')
}

/**************************************
 * Custom events
 **************************************/

type CustomBehaviorEventNamespace = 'custom'

type CustomBehaviorEventType<
  TNamespace extends CustomBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

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

/**************************************
 * Resolve behavior event
 **************************************/

export type ResolveBehaviorEvent<
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
