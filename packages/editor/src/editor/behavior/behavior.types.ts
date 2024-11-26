import type {
  KeyedSegment,
  PortableTextBlock,
  PortableTextTextBlock,
} from '@sanity/types'
import type {TextUnit} from 'slate'
import type {TextInsertTextOptions} from 'slate/dist/interfaces/transforms/text'
import type {
  EditorSelection,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {BlockOffset} from './behavior.utils.block-offset'

/**
 * @alpha
 */
export type BehaviorContext = {
  schema: PortableTextMemberSchemaTypes
  value: Array<PortableTextBlock>
  selection: NonNullable<EditorSelection>
}

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
      type: 'delete backward'
      unit: TextUnit
    }
  | {
      type: 'delete forward'
      unit: TextUnit
    }
  | {
      type: 'focus'
    }
  | {
      type: 'insert soft break'
    }
  | {
      type: 'insert break'
    }
  | {
      type: 'insert text'
      text: string
      options?: TextInsertTextOptions
    }
  | {
      type: 'paste'
      clipboardData: NonNullable<ClipboardEvent['clipboardData']>
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
  event: TBehaviorEvent
  context: BehaviorContext
}) => TGuardResponse | false

/**
 * @alpha
 */
export type BehaviorActionIntend =
  | BehaviorEvent
  | {
      type: 'insert block object'
      placement: 'auto' | 'after' | 'before'
      blockObject: {
        name: string
        value?: {[prop: string]: unknown}
      }
    }
  | {
      type: 'insert span'
      text: string
      annotations?: Array<{
        name: string
        value: {[prop: string]: unknown}
      }>
      decorators?: Array<string>
    }
  | {
      type: 'insert text block'
      placement: 'auto' | 'after' | 'before'
      textBlock?: {
        children?: PortableTextTextBlock['children']
      }
    }
  | {
      type: 'set block'
      paths: Array<[KeyedSegment]>
      style?: string
      listItem?: string
      level?: number
    }
  | {
      type: 'unset block'
      paths: Array<[KeyedSegment]>
      props: Array<'style' | 'listItem' | 'level'>
    }
  | {
      type: 'delete block'
      blockPath: [KeyedSegment]
    }
  | {
      type: 'delete text'
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
      type: 'reselect'
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
  actions: Array<BehaviorActionIntendSet<TBehaviorEventType, TGuardResponse>>
}

/**
 * @alpha
 */
export type BehaviorActionIntendSet<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
> = (
  {
    context,
    event,
  }: {
    context: BehaviorContext
    event: PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>
  },
  guardResponse: TGuardResponse,
) => Array<BehaviorActionIntend>

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
