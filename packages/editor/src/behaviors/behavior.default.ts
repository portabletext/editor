import type {MIMEType} from '../internal-utils/mime-type'
import * as selectors from '../selectors'
import {converterBehaviorJson} from './behavior.default.converter.json'
import {converterBehaviorPortableText} from './behavior.default.converter.portable-text'
import {converterBehaviorTextHtml} from './behavior.default.converter.text-html'
import {converterBehaviorTextPlain} from './behavior.default.converter.text-plain'
import {defineBehavior, raise} from './behavior.types'
import {runBehavior} from './run-behavior'

const toggleAnnotationOff = defineBehavior({
  on: 'annotation.toggle',
  guard: ({snapshot, event}) =>
    selectors.isActiveAnnotation(event.annotation.name)(snapshot),
  actions: [
    ({event}) => [
      raise({type: 'annotation.remove', annotation: event.annotation}),
    ],
  ],
})

const toggleAnnotationOn = defineBehavior({
  on: 'annotation.toggle',
  guard: ({snapshot, event}) =>
    !selectors.isActiveAnnotation(event.annotation.name)(snapshot),
  actions: [
    ({event}) => [
      raise({type: 'annotation.add', annotation: event.annotation}),
    ],
  ],
})

const toggleDecoratorOff = defineBehavior({
  on: 'decorator.toggle',
  guard: ({snapshot, event}) =>
    selectors.isActiveDecorator(event.decorator)(snapshot),
  actions: [
    ({event}) => [
      raise({type: 'decorator.remove', decorator: event.decorator}),
    ],
  ],
})

const toggleDecoratorOn = defineBehavior({
  on: 'decorator.toggle',
  guard: ({snapshot, event}) =>
    !selectors.isActiveDecorator(event.decorator)(snapshot),
  actions: [
    ({event}) => [raise({type: 'decorator.add', decorator: event.decorator})],
  ],
})

const toggleListItemOff = defineBehavior({
  on: 'list item.toggle',
  guard: ({snapshot, event}) =>
    selectors.isActiveListItem(event.listItem)(snapshot),
  actions: [
    ({event}) => [
      raise({
        type: 'list item.remove',
        listItem: event.listItem,
      }),
    ],
  ],
})

const toggleListItemOn = defineBehavior({
  on: 'list item.toggle',
  guard: ({snapshot, event}) =>
    !selectors.isActiveListItem(event.listItem)(snapshot),
  actions: [
    ({event}) => [
      raise({
        type: 'list item.add',
        listItem: event.listItem,
      }),
    ],
  ],
})

const toggleStyleOff = defineBehavior({
  on: 'style.toggle',
  guard: ({snapshot, event}) => selectors.isActiveStyle(event.style)(snapshot),
  actions: [({event}) => [raise({type: 'style.remove', style: event.style})]],
})

const toggleStyleOn = defineBehavior({
  on: 'style.toggle',
  guard: ({snapshot, event}) => !selectors.isActiveStyle(event.style)(snapshot),
  actions: [({event}) => [raise({type: 'style.add', style: event.style})]],
})

const raiseDeserializationFailure = defineBehavior({
  on: 'deserialize',
  guard: ({event}) => {
    const mimeTypes = event.dataTransfer.types.flatMap((type) =>
      type === 'Files'
        ? Array.from(event.dataTransfer.files).map((file) => file.type)
        : type,
    ) as Array<MIMEType>
    return {mimeTypes}
  },
  actions: [
    ({event}, {mimeTypes}) =>
      mimeTypes.map((mimeType) =>
        raise({
          type: 'deserialization.failure',
          dataTransfer: event.dataTransfer,
          mimeType,
          reason: 'Unhandled "deserialize" event',
        }),
      ),
  ],
})

const raiseInsertBlocks = defineBehavior({
  on: 'deserialization.success',
  actions: [
    ({event}) => [
      raise({
        type: 'insert.blocks',
        blocks: event.data,
      }),
    ],
  ],
})

const raiseSerializationSuccessOrFailure = defineBehavior({
  on: 'serialize',
  guard: ({snapshot, context, event}) => {
    const actionSet = [
      converterBehaviorJson.serialize,
      converterBehaviorPortableText.serialize,
      converterBehaviorTextHtml.serialize,
      converterBehaviorTextPlain.serialize,
    ].flatMap(
      (behavior) =>
        runBehavior(behavior)({snapshot, context, event})?.actionSets.flat() ??
        [],
    )

    return actionSet
  },
  actions: [(_, actionSet) => actionSet],
})

const raiseSerializationFailure = defineBehavior({
  on: 'serialize',
  actions: [
    ({event}) => [
      raise({
        type: 'serialization.failure',
        dataTransfer: event.dataTransfer,
        reason: 'Unhandled "serialize" event',
        mimeType: 'application/x-portable-text',
        originEvent: event.originEvent,
      }),
    ],
  ],
})

const raiseDataTransferSet = defineBehavior({
  on: 'serialization.success',
  actions: [
    ({event}) => [
      raise({
        type: 'data transfer.set',
        data: event.data,
        dataTransfer: event.dataTransfer,
        mimeType: event.mimeType,
      }),
    ],
  ],
})

export const defaultBehaviors = [
  toggleAnnotationOff,
  toggleAnnotationOn,
  toggleDecoratorOff,
  toggleDecoratorOn,
  toggleListItemOff,
  toggleListItemOn,
  toggleStyleOff,
  toggleStyleOn,
  converterBehaviorJson.deserialize,
  converterBehaviorPortableText.deserialize,
  converterBehaviorTextHtml.deserialize,
  converterBehaviorTextPlain.deserialize,
  raiseDeserializationFailure,
  raiseInsertBlocks,
  raiseSerializationSuccessOrFailure,
  raiseSerializationFailure,
  raiseDataTransferSet,
]
