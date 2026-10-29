# Inline objects from rules and pickers

Inserting an inline object (a chip, a variable, a token) from an input rule or a typeahead picker has one trap: where the caret ends up.

## The rule

After `insert.child` with an inline object, the selection sits on the object, not after it. From an input rule, the keys the user types next are lost. The core `insert.inline object` event is a thin wrapper over `insert.child` and behaves the same way.

The span after an inline object at the end of a block is created by normalization. When an action set holds more than one action and all of them are `raise`, normalization is deferred until the whole set has applied, which is the shape of an insert-then-select set. A step inside that set cannot select the span, because it does not exist yet. Two things fix this together:

1. Insert the trailing empty span yourself, right after the object.
2. Raise a custom event carrying the object's path, and select the next sibling in a companion Behavior. A Behavior handling a raised event sees the document with the earlier raises applied, unlike the action callback that raised it.

Inserting the span alone is enough when the insert runs from a picker's `onSelect`, but not from an input rule. Use both steps everywhere and one helper serves both.

## The helper

```tsx
import type {Path} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getSibling} from '@portabletext/editor/traversal'

export function insertInlineObjectWithCaretAfter(config: {
  blockPath: Path
  inlineObject: {_type: string; [field: string]: unknown}
  spanType: string
  keyGenerator: () => string
}) {
  // Generate the key up front: the callback cannot read keys from the
  // raised insert, and the companion Behavior needs the object's path.
  const inlineObjectKey = config.keyGenerator()

  return [
    raise({
      type: 'insert.child',
      child: {...config.inlineObject, _key: inlineObjectKey},
    }),
    raise({
      type: 'insert.child',
      child: {_type: config.spanType, text: '', marks: []},
    }),
    raise({
      type: 'custom.caret after inline object',
      path: [...config.blockPath, 'children', {_key: inlineObjectKey}],
    }),
  ]
}

export const caretAfterInlineObject = defineBehavior<
  {path: Path},
  'custom.caret after inline object',
  {nextSibling: {path: Path}}
>({
  on: 'custom.caret after inline object',
  guard: ({snapshot, event}) => {
    const nextSibling = getSibling(snapshot, event.path, {direction: 'next'})

    return nextSibling ? {nextSibling} : false
  },
  actions: [
    (_, {nextSibling}) => [
      raise({
        type: 'select',
        at: {
          anchor: {path: nextSibling.path, offset: 0},
          focus: {path: nextSibling.path, offset: 0},
        },
      }),
    ],
  ],
})
```

Mount `caretAfterInlineObject` once with `BehaviorPlugin`, next to the rule or picker that uses the helper.

## From an input rule

Typing `{{firstName}}` becomes a `variable` inline object, and the user keeps typing after it. Delete the match with `match.targetOffsets` first. The rule plugin lets the typed `}` land in its own undo step, so one undo turns the chip back into `{{firstName}}`.

```tsx
import {defineInlineObject, defineSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {defineInputRule, InputRulePlugin} from '@portabletext/plugin-input-rule'
import {
  caretAfterInlineObject,
  insertInlineObjectWithCaretAfter,
} from './caret-after-inline-object'

export const schemaDefinition = defineSchema({
  inlineObjects: [{name: 'variable', fields: [{name: 'name', type: 'string'}]}],
})

const variableRule = defineInputRule({
  on: /\{\{(?<name>\w+)\}\}$/,
  guard: ({event}) => {
    const match = event.matches.at(0)
    const name = match?.groups['name']?.text

    return match && name ? {match, name} : false
  },
  actions: [
    ({snapshot, event}, {match, name}) => [
      raise({type: 'delete', at: match.targetOffsets}),
      ...insertInlineObjectWithCaretAfter({
        blockPath: event.focusBlock.path,
        inlineObject: {_type: 'variable', name},
        spanType: snapshot.context.schema.span.name,
        keyGenerator: snapshot.context.keyGenerator,
      }),
    ],
  ],
})

const variableNodes = [
  defineInlineObject({
    type: 'variable',
    render: (props) => (
      <span {...props.attributes}>
        {props.children}
        <span style={{display: 'inline-block'}}>
          {String(props.node['name'])}
        </span>
      </span>
    ),
  }),
]

const rules = [variableRule]
const behaviors = [caretAfterInlineObject]

export function VariablePlugin() {
  return (
    <>
      <NodePlugin nodes={variableNodes} />
      <BehaviorPlugin behaviors={behaviors} />
      <InputRulePlugin rules={rules} />
    </>
  )
}
```

## From a typeahead picker

Here `$` opens a variable picker. Triggers must be a single character, so `{{` cannot be the picker's trigger. In `onSelect`, delete `event.patternSelection` (the trigger plus the keyword), then use the same helper. `onSelect` does not carry the block path, so read it with `getFocusTextBlock`.

```tsx
import {raise} from '@portabletext/editor/behaviors'
import {getFocusTextBlock} from '@portabletext/editor/selectors'
import {defineTypeaheadPicker} from '@portabletext/plugin-typeahead-picker'
import {insertInlineObjectWithCaretAfter} from './caret-after-inline-object'

type Variable = {name: string}

const variables: Array<Variable> = [{name: 'firstName'}, {name: 'lastName'}]

export const variablePicker = defineTypeaheadPicker<Variable>({
  trigger: /\$/,
  keyword: /\w*/,
  getMatches: ({keyword}) =>
    variables.filter((variable) => variable.name.startsWith(keyword)),
  onSelect: [
    ({snapshot, event}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return []
      }

      return [
        raise({type: 'delete', at: event.patternSelection}),
        ...insertInlineObjectWithCaretAfter({
          blockPath: focusTextBlock.path,
          inlineObject: {_type: 'variable', name: event.match.name},
          spanType: snapshot.context.schema.span.name,
          keyGenerator: snapshot.context.keyGenerator,
        }),
      ]
    },
  ],
})
```

## Rendering

Spread `props.attributes` on the outer element and render `props.children` inside it, as above. The chip's visible content goes in a sibling element. Under `noPropertyAccessFromIndexSignature`, read fields as `props.node['name']` and narrow them.
