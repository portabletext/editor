import type {PortableTextBlock} from '@sanity/types'
import type {EventPosition} from '../internal-utils/event-position'
import type {MIMEType} from '../internal-utils/mime-type'
import type {OmitFromUnion, PickFromUnion, StrictExtract} from '../type-utils'
import type {BlockOffset} from '../types/block-offset'
import type {BlockWithOptionalKey} from '../types/block-with-optional-key'
import type {EditorSelection} from '../types/editor'
import type {AnnotationPath, BlockPath, ChildPath} from '../types/paths'

/**
 * @beta
 */
export type BehaviorEvent =
  | SyntheticBehaviorEvent
  | NativeBehaviorEvent
  | CustomBehaviorEvent

export type BehaviorEventTypeNamespace =
  | SyntheticBehaviorEventNamespace
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
  'child.set',
  'child.unset',
  'decorator.add',
  'decorator.remove',
  'delete',
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
] as const

type SyntheticBehaviorEventType =
  | (typeof syntheticBehaviorEventTypes)[number]
  | (typeof abstractBehaviorEventTypes)[number]

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
      at: BlockPath
      props: Record<string, unknown>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'block.unset'>
      at: BlockPath
      props: Array<string>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'child.set'>
      at: ChildPath
      props: {[prop: string]: unknown}
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'child.unset'>
      at: ChildPath
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
      /**
       * Defaults to forward deletion.
       */
      direction?: 'backward' | 'forward'
      /**
       * Defaults to character deletion.
       */
      unit?: 'character' | 'word' | 'line' | 'block'
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
      at: BlockPath
      to: BlockPath
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'move.forward'>
      distance: number
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'select'>
      at: EditorSelection
    }
  | AbstractBehaviorEvent

/**
 * @beta
 */
export type InsertPlacement = 'auto' | 'after' | 'before'

export function isSyntheticBehaviorEvent(
  event: BehaviorEvent,
): event is OmitFromUnion<
  SyntheticBehaviorEvent,
  'type',
  AbstractBehaviorEventType
> {
  return (
    !isCustomBehaviorEvent(event) &&
    !isNativeBehaviorEvent(event) &&
    !isAbstractBehaviorEvent(event)
  )
}

/**************************************
 * Abstract events
 **************************************/

const abstractBehaviorEventTypes = [
  'annotation.set',
  'annotation.toggle',
  'decorator.toggle',
  'delete.backward',
  'delete.block',
  'delete.child',
  'delete.forward',
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
  'split',
  'style.add',
  'style.remove',
  'style.toggle',
] as const

export type AbstractBehaviorEventType =
  (typeof abstractBehaviorEventTypes)[number]

type AbstractBehaviorEvent =
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'annotation.set'>
      at: AnnotationPath
      props: Record<string, unknown>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'annotation.toggle'>
      annotation: {
        name: string
        value: {[prop: string]: unknown}
      }
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'decorator.toggle'>
      decorator: string
      at?: {anchor: BlockOffset; focus: BlockOffset}
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.backward'>
      unit: 'character' | 'word' | 'line' | 'block'
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.block'>
      at: BlockPath
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.child'>
      at: ChildPath
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.forward'>
      unit: 'character' | 'word' | 'line' | 'block'
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'delete.text'>
      at: {
        anchor: BlockOffset
        focus: BlockOffset
      }
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'deserialize'>
      originEvent:
        | PickFromUnion<
            NativeBehaviorEvent,
            'type',
            'drag.drop' | 'clipboard.paste'
          >
        | InputBehaviorEvent
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'serialize'>
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'deserialization.success'>
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
      type: StrictExtract<SyntheticBehaviorEventType, 'deserialization.failure'>
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
      type: StrictExtract<SyntheticBehaviorEventType, 'serialization.success'>
      mimeType: MIMEType
      data: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'serialization.failure'>
      mimeType: MIMEType
      reason: string
      originEvent: PickFromUnion<
        NativeBehaviorEvent,
        'type',
        'clipboard.copy' | 'clipboard.cut' | 'drag.dragstart'
      >
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.blocks'>
      blocks: Array<BlockWithOptionalKey>
      placement: InsertPlacement
      select?: 'start' | 'end' | 'none'
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.break'>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'insert.soft break'>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'list item.add'>
      listItem: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'list item.remove'>
      listItem: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'list item.toggle'>
      listItem: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'move.block down'>
      at: BlockPath
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'move.block up'>
      at: BlockPath
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'select.previous block'>
      select?: 'start' | 'end'
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'select.next block'>
      select?: 'start' | 'end'
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'split'>
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'style.add'>
      style: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'style.remove'>
      style: string
    }
  | {
      type: StrictExtract<SyntheticBehaviorEventType, 'style.toggle'>
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
        clientX: number
        clientY: number
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
      dragOrigin?: Pick<EventPosition, 'selection'>
      position: EventPosition
    }
  | {
      type: StrictExtract<NativeBehaviorEventType, 'drag.drop'>
      originEvent: {
        dataTransfer: DataTransfer
      }
      dragOrigin?: Pick<EventPosition, 'selection'>
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
