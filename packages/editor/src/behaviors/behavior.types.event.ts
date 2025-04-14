import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {EventPosition} from '../internal-utils/event-position'
import type {MIMEType} from '../internal-utils/mime-type'
import type {PickFromUnion, StrictExtract} from '../type-utils'
import type {BlockOffset} from '../types/block-offset'
import type {BlockWithOptionalKey} from '../types/block-with-optional-key'
import type {EditorSelection} from '../types/editor'

/**
 * @beta
 */
export type BehaviorEvent =
  | SyntheticBehaviorEvent
  | AbstractBehaviorEvent
  | NativeBehaviorEvent
  | CustomBehaviorEvent

export type BehaviorEventTypeNamespace =
  | SyntheticBehaviorEventNamespace
  | AbstractBehaviorEventNamespace
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

type ExternalBehaviorEventNamespace = 'blur' | 'focus' | 'insert'

type ExternalBehaviorEventType<
  TNamespace extends ExternalBehaviorEventNamespace,
  TType extends string = '',
> = TType extends '' ? `${TNamespace}` : `${TNamespace}.${TType}`

export type ExternalBehaviorEvent =
  | {
      type: ExternalBehaviorEventType<'blur'>
    }
  | {
      type: ExternalBehaviorEventType<'focus'>
    }
  | {
      type: ExternalBehaviorEventType<'insert', 'block object'>
      placement: InsertPlacement
      blockObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | AbstractBehaviorEvent
  | SyntheticBehaviorEvent
  | CustomBehaviorEvent

/**************************************
 * Synthetic events
 **************************************/

const syntheticBehaviorEventTypes = [
  'annotation.add',
  'annotation.remove',
  'block.set',
  'block.unset',
  'decorator.add',
  'decorator.remove',
  'delete',
  'delete.backward',
  'delete.block',
  'delete.forward',
  'history.redo',
  'history.undo',
  'insert.inline object',
  'insert.block',
  'insert.span',
  'insert.text',
  'move.backward',
  'move.block',
  'move.forward',
  'select',
  'split.block',
] as const

type SyntheticBehaviorEventType = (typeof syntheticBehaviorEventTypes)[number]

type SyntheticBehaviorEventNamespace =
  ExtractNamespace<SyntheticBehaviorEventType>

/**
 * @beta
 */
export type SyntheticBehaviorEvent =
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'annotation.add'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'annotation.remove'>
      annotation: {
        name: string
      }
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'block.set'>
      at: [KeyedSegment]
      props: Record<string, unknown>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'block.unset'>
      at: [KeyedSegment]
      props: Array<string>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'decorator.add'>
      decorator: string
      at?: {
        anchor: BlockOffset
        focus: BlockOffset
      }
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'decorator.remove'>
      decorator: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete'>
      at: NonNullable<EditorSelection>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.backward'>
      unit: TextUnit
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.block'>
      at: [KeyedSegment]
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.forward'>
      unit: TextUnit
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'history.redo'>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'history.undo'>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.inline object'>
      inlineObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.block'>
      block: BlockWithOptionalKey
      placement: InsertPlacement
      select?: 'start' | 'end' | 'none'
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.span'>
      text: string
      annotations?: Array<{
        name: string
        value: {[prop: string]: unknown}
      }>
      decorators?: Array<string>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.text'>
      text: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'move.backward'>
      distance: number
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'move.block'>
      at: [KeyedSegment]
      to: [KeyedSegment]
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'move.forward'>
      distance: number
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'select'>
      at: EditorSelection
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'split.block'>
    }

export type InsertPlacement = 'auto' | 'after' | 'before'

export function isKeyboardBehaviorEvent(
  event: BehaviorEvent,
): event is KeyboardBehaviorEvent {
  return event.type.startsWith('keyboard.')
}

/**************************************
 * Abstract events
 **************************************/

const abstractBehaviorEventTypes = [
  'annotation.toggle',
  'decorator.toggle',
  'delete.text',
  'deserialize',
  'deserialization.success',
  'deserialization.failure',
  'insert.blocks',
  'insert.break',
  'insert.soft break',
  'list item.add',
  'list item.remove',
  'list item.toggle',
  'move.block down',
  'move.block up',
  'select.previous block',
  'select.next block',
  'serialize',
  'serialization.success',
  'serialization.failure',
  'style.add',
  'style.remove',
  'style.toggle',
] as const

type AbstractBehaviorEventType = (typeof abstractBehaviorEventTypes)[number]

type AbstractBehaviorEventNamespace =
  ExtractNamespace<AbstractBehaviorEventType>

export type AbstractBehaviorEvent =
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'annotation.toggle'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'decorator.toggle'>
      decorator: string
      at?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'delete.text'>
      at: {
        anchor: BlockOffset
        focus: BlockOffset
      }
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'deserialize'>
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'serialize'>
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'deserialization.success'>
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
      type: StrictExtract<AbstractBehaviorEventType, 'deserialization.failure'>
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
      type: StrictExtract<AbstractBehaviorEventType, 'serialization.success'>
      mimeType: MIMEType
      data: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'serialization.failure'>
      mimeType: MIMEType
      reason: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'insert.blocks'>
      blocks: Array<PortableTextBlock>
      placement: InsertPlacement
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'insert.break'>
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'insert.soft break'>
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'list item.add'>
      listItem: string
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'list item.remove'>
      listItem: string
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'list item.toggle'>
      listItem: string
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'move.block down'>
      at: [KeyedSegment]
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'move.block up'>
      at: [KeyedSegment]
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'select.previous block'>
      select?: 'start' | 'end'
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'select.next block'>
      select?: 'start' | 'end'
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'style.add'>
      style: string
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'style.remove'>
      style: string
    }
  | {
      type: StrictExtract<AbstractBehaviorEventType, 'style.toggle'>
      style: string
    }

export function isAbstractBehaviorEvent(
  event: BehaviorEvent,
): event is AbstractBehaviorEvent {
  return (abstractBehaviorEventTypes as readonly string[]).includes(event.type)
}

/**************************************
 * Native events
 **************************************/

const nativeBehaviorEventTypes = [
  'clipboard.copy',
  'clipboard.cut',
  'clipboard.paste',
  'drag.dragstart',
  'drag.drag',
  'drag.dragend',
  'drag.dragenter',
  'drag.dragover',
  'drag.dragleave',
  'drag.drop',
  'input.*',
  'keyboard.keydown',
  'keyboard.keyup',
  'mouse.click',
] as const

type NativeBehaviorEventType = (typeof nativeBehaviorEventTypes)[number]

type NativeBehaviorEventNamespace = ExtractNamespace<NativeBehaviorEventType>

export function isNativeBehaviorEvent(
  event: BehaviorEvent,
): event is NativeBehaviorEvent {
  return (nativeBehaviorEventTypes as readonly string[]).includes(event.type)
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
      type: StrictExtract<NativeBehaviorEventType, 'clipboard.copy'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'clipboard.cut'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'clipboard.paste'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }

type DragBehaviorEvent =
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.dragstart'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: Pick<EventPosition, 'selection'>
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.drag'>
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.dragend'>
      originEvent: {
        dataTransfer: DataTransfer
      }
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.dragenter'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.dragover'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.drop'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      position: EventPosition
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.dragleave'>
      originEvent: {
        dataTransfer: DataTransfer
      }
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
  type: StrictExtract<NativeBehaviorEventType, 'input.*'>
  originEvent: {
    dataTransfer: DataTransfer
  }
}

export type KeyboardBehaviorEvent =
  | {
      type: StrictExtract<NativeBehaviorEventType, 'keyboard.keydown'>
      originEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'keyboard.keyup'>
      originEvent: Pick<
        KeyboardEvent,
        'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
      >
    }

export type MouseBehaviorEvent = {
  type: StrictExtract<NativeBehaviorEventType, 'mouse.click'>
  position: EventPosition
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

type ExtractNamespace<TType extends string> =
  TType extends `${infer Namespace}.${string}` ? Namespace : TType
