import {isTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {defineBehavior, execute, raise} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {getTextMarks} from '../src/internal-utils/text-marks'
import {getTextSelection} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins'
import {isActiveAnnotation} from '../src/selectors'

/**
 * By default, annotations of the same type cannot overlap.
 */
describe('overlapping annotations', () => {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const fooKey = keyGenerator()
  const barKey = keyGenerator()
  const bazKey = keyGenerator()
  const commentKey = keyGenerator()
  const value = [
    {
      _type: 'block',
      _key: blockKey,
      children: [
        {
          _type: 'span',
          _key: fooKey,
          text: 'foo ',
        },
        {
          _type: 'span',
          _key: barKey,
          text: 'bar',
          marks: [commentKey],
        },
        {
          _type: 'span',
          _key: bazKey,
          text: ' baz',
        },
      ],
      markDefs: [{_key: commentKey, _type: 'comment', text: 'Comment A'}],
    },
  ]
  const schemaDefinition = defineSchema({
    annotations: [
      {name: 'comment', fields: [{name: 'text', type: 'string'}]},
      {name: 'link', fields: [{name: 'href', type: 'string'}]},
    ],
  })

  test('default behavior', async () => {
    const {editorRef} = await createTestEditor({
      keyGenerator,
      initialValue: value,
      schemaDefinition,
    })

    editorRef.current?.send({
      type: 'select',
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'o bar b'),
    })

    editorRef.current?.send({
      type: 'annotation.toggle',
      annotation: {
        name: 'comment',
        value: {
          text: 'Comment B',
        },
      },
    })

    await vi.waitFor(() => {
      // Then the text is "fo,o bar b,az"
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'fo,o bar b,az',
      ])

      const block = editorRef.current!.getSnapshot().context.value.at(0)

      if (!isTextBlock(editorRef.current!.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      // And only Comment B is present
      expect(block.markDefs).toEqual([
        expect.objectContaining({
          _type: 'comment',
          text: 'Comment B',
        }),
      ])
      expect(
        getTextMarks(editorRef.current!.getSnapshot().context, 'o bar b'),
      ).toEqual(block.markDefs?.map((markDef) => markDef._key))
    })
  })

  test('allowing overlapping annotations', async () => {
    const {editorRef} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'annotation.add',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      ),
      keyGenerator,
      initialValue: value,
      schemaDefinition,
    })

    editorRef.current?.send({
      type: 'select',
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'o bar b'),
    })

    editorRef.current?.send({
      type: 'annotation.toggle',
      annotation: {
        name: 'comment',
        value: {text: 'Comment B'},
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'fo,o ,bar, b,az',
      ])

      const block = editorRef.current!.getSnapshot().context.value.at(0)

      if (!isTextBlock(editorRef.current!.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      expect(block.markDefs).toEqual([
        {
          _key: commentKey,
          _type: 'comment',
          text: 'Comment A',
        },
        expect.objectContaining({
          _type: 'comment',
          text: 'Comment B',
        }),
      ])

      expect(
        getTextMarks(editorRef.current!.getSnapshot().context, 'bar'),
      ).toEqual(block.markDefs?.map((markDef) => markDef._key))
    })
  })

  test('manually configuring mutually exclusive annotations', async () => {
    const mutuallyExclusives: Record<string, string[]> = {
      link: ['comment'],
    }

    const {editorRef} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'annotation.add',
              guard: ({snapshot, event}) => {
                const mutuallyExclusive =
                  mutuallyExclusives[event.annotation.name]

                if (!mutuallyExclusive) {
                  return false
                }

                const activeMutuallyExclusive = mutuallyExclusive.filter(
                  (annotation) =>
                    isActiveAnnotation(annotation, {mode: 'partial'})(snapshot),
                )

                return {activeMutuallyExclusive}
              },
              actions: [
                ({event}, {activeMutuallyExclusive}) => [
                  ...activeMutuallyExclusive.map((annotation) =>
                    raise({
                      type: 'annotation.remove',
                      annotation: {name: annotation},
                    }),
                  ),
                  execute(event),
                ],
              ],
            }),
          ]}
        />
      ),
      keyGenerator,
      initialValue: value,
      schemaDefinition,
    })

    editorRef.current?.send({
      type: 'select',
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'o bar b'),
    })

    editorRef.current?.send({
      type: 'annotation.toggle',
      annotation: {name: 'link', value: {href: 'https://portabletext.org'}},
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'fo,o bar b,az',
      ])

      const block = editorRef.current!.getSnapshot().context.value.at(0)

      if (!isTextBlock(editorRef.current!.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      expect(block.markDefs).toEqual([
        expect.objectContaining({
          _type: 'link',
          href: 'https://portabletext.org',
        }),
      ])
    })

    editorRef.current?.send({
      type: 'select',
      at: getTextSelection(editorRef.current!.getSnapshot().context, 'foo'),
    })

    editorRef.current?.send({
      type: 'annotation.toggle',
      annotation: {name: 'link', value: {href: 'https://sanity.io'}},
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        'fo,o, bar b,az',
      ])

      const block = editorRef.current!.getSnapshot().context.value.at(0)

      if (!isTextBlock(editorRef.current!.getSnapshot().context, block)) {
        throw new Error('Block is not a text block')
      }

      expect(block.markDefs).toEqual([
        expect.objectContaining({
          _type: 'link',
          href: 'https://portabletext.org',
        }),
        expect.objectContaining({
          _type: 'link',
          href: 'https://sanity.io',
        }),
      ])
    })
  })
})
