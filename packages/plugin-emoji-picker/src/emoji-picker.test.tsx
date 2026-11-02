import {
  defineBehavior,
  effect,
  forward,
  type BehaviorEvent,
} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {Before, Then} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect, test, vi} from 'vitest'
import {page, type Locator} from 'vitest/browser'
import {createMatchEmojis} from './create-match-emojis'
import emojiPickerFeature from './emoji-picker.feature?raw'
import {useEmojiPicker} from './use-emoji-picker'

type EmojiPickerTestContext = Context & {
  keywordLocator: Locator
  matchesLocator: Locator
}

Feature({
  hooks: [
    Before(async (context: EmojiPickerTestContext) => {
      const {editor, locator} = await createTestEditor({
        children: <EmojiPickerPlugin />,
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
      context.keywordLocator = page.getByTestId('keyword')
      context.matchesLocator = page.getByTestId('matches')

      await expect.element(context.keywordLocator).toBeInTheDocument()
      await expect.element(context.matchesLocator).toBeInTheDocument()
    }),
  ],
  featureText: emojiPickerFeature,
  stepDefinitions: [
    ...stepDefinitions,
    Then(
      'the keyword is {string}',
      (context: EmojiPickerTestContext, keyword: string) => {
        expect(context.keywordLocator.element().textContent).toEqual(keyword)
      },
    ),
    Then(
      'the matches are {string}',
      (context: EmojiPickerTestContext, matches: string) => {
        expect(context.matchesLocator.element().textContent).toEqual(matches)
      },
    ),
  ],
  parameterTypes,
})

test('Scenario: `insert.text` of a colon at a position in another block does not trigger the picker at the caret', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockAKey = keyGenerator()
  const spanAKey = keyGenerator()
  const blockBKey = keyGenerator()
  const spanBKey = keyGenerator()
  const events: Array<BehaviorEvent> = []

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo ', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: (
      <>
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: '*',
              actions: [
                ({event}) => [
                  forward(event),
                  effect(() => {
                    events.push(event)
                  }),
                ],
              ],
            }),
          ]}
        />
        <EmojiPickerPlugin />
      </>
    ),
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      backward: false,
    })
  })

  editor.send({
    type: 'insert.text',
    at: [{_key: blockBKey}, 'children', {_key: spanBKey}],
    offset: 3,
    text: ':',
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo ', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, text: 'bar:', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      backward: false,
    })
  })

  expect(events).toEqual([
    {
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 4,
        },
      },
    },
    {
      type: 'insert.text',
      at: [{_key: blockBKey}, 'children', {_key: spanBKey}],
      offset: 3,
      text: ':',
    },
  ])
})

test('Scenario: `insert.text` at a position in another block does not dismiss the picker with the caret before the colon', async () => {
  const keyGenerator = createTestKeyGenerator()
  const blockAKey = keyGenerator()
  const spanAKey = keyGenerator()
  const blockBKey = keyGenerator()
  const spanBKey = keyGenerator()

  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue: [
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo ', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ],
    children: <EmojiPickerPlugin />,
  })

  const keywordLocator = page.getByTestId('keyword')
  const matchesLocator = page.getByTestId('matches')

  await expect.element(keywordLocator).toBeInTheDocument()
  await expect.element(matchesLocator).toBeInTheDocument()

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
    },
  })
  editor.send({type: 'insert.text', text: ':'})
  editor.send({type: 'insert.text', text: 'j'})
  editor.send({type: 'insert.text', text: 'o'})

  await vi.waitFor(() => {
    expect(keywordLocator.element().textContent).toEqual('jo')
    expect(matchesLocator.element().textContent).toEqual('😂,😹,🕹️')
  })

  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
    },
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      backward: false,
    })
    expect(keywordLocator.element().textContent).toEqual('jo')
    expect(matchesLocator.element().textContent).toEqual('😂,😹,🕹️')
  })

  editor.send({
    type: 'insert.text',
    at: [{_key: blockBKey}, 'children', {_key: spanBKey}],
    offset: 3,
    text: 'baz',
  })

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockAKey,
        children: [{_type: 'span', _key: spanAKey, text: 'foo :jo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: blockBKey,
        children: [{_type: 'span', _key: spanBKey, text: 'barbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      focus: {
        path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
        offset: 4,
      },
      backward: false,
    })
  })

  expect(keywordLocator.element().textContent).toEqual('jo')
  expect(matchesLocator.element().textContent).toEqual('😂,😹,🕹️')
})

const emojis: Record<string, Array<string>> = {
  '😂': ['joy'],
  '😹': ['joy_cat'],
  '🕹️': ['joy!stick'],
  '😘': ['*'],
  '❗️': ['!'],
  '⁉️': ['!?'],
  '‼️': ['!!'],
  '😊': [':)'],
  '🐕': ['dog'],
  '🐩': ['dog'],
}

const matchEmojis = createMatchEmojis({emojis})

function EmojiPickerPlugin() {
  const {keyword, matches} = useEmojiPicker({matchEmojis})

  return (
    <>
      <div data-testid="keyword">{keyword}</div>
      <div data-testid="matches">
        {matches.map((match) => match.emoji).join(',')}
      </div>
    </>
  )
}
