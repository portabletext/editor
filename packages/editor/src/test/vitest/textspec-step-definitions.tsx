import {fromTextspec, toTextspec} from '@portabletext/textspec'
import {Given, Then, When} from 'racejar'
import {expect, vi} from 'vitest'
import type {Context} from './step-context'
import type {Parameter} from '../gherkin-parameter-types'

/**
 * Step definitions using textspec notation.
 *
 * These are the textspec equivalents of the terse-pt step definitions
 * in step-definitions.tsx. Both coexist during the migration period.
 *
 * Step names match the terse-pt originals so feature files only need
 * to change the parameter type from {terse-pt} to {textspec}.
 */
export const textspecStepDefinitions = [
  Given(
    'the text {textspec}',
    (context: Context, textspec: Parameter['textspec']) => {
      const {blocks, selection} = fromTextspec(
        {
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        textspec,
      )
      context.editor.send({
        type: 'insert.blocks',
        blocks,
        placement: 'auto',
        select: 'end',
      })
      if (selection) {
        context.editor.send({
          type: 'select',
          selection,
        })
      }
    },
  ),
  Then(
    'the text is {textspec}',
    async (context: Context, textspec: Parameter['textspec']) => {
      await vi.waitFor(() => {
        expect(
          toTextspec(context.editor.getSnapshot().context),
          'Unexpected editor text',
        ).toBe(textspec)
      })
    },
  ),
  Then(
    '{textspec} is in block {key}',
    (context: Context, textspec: Parameter['textspec'], key: string) => {
      // textspec for a single block assertion - extract the text content
      // and delegate to the same block key lookup
      const {blocks} = fromTextspec(
        {
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        textspec,
      )
      const block = blocks.at(0)
      if (!block) {
        throw new Error('Expected at least one block in textspec')
      }
      if (blocks.length > 1) {
        throw new Error('Expected at most one block in textspec')
      }
      // Use toTextspec to get the text representation and compare block keys
      const snapshot = context.editor.getSnapshot().context
      const matchingBlock = snapshot.value.find((b) => {
        return toTextspec({schema: snapshot.schema, value: [b]}) === textspec
      })
      if (!matchingBlock) {
        throw new Error(`No block matching textspec: ${textspec}`)
      }
      expect(matchingBlock._key).toBe(key)
    },
  ),
  Then(
    '{textspec} is selected',
    async (context: Context, textspec: Parameter['textspec']) => {
      await vi.waitFor(() => {
        const snapshot = context.editor.getSnapshot().context
        const state = toTextspec({
          schema: snapshot.schema,
          value: snapshot.value,
          selection: snapshot.selection ?? undefined,
        })
        // The textspec should appear somewhere in the full state
        // or match the selected text representation
        expect(state, 'Unexpected selection').toContain(textspec)
      })
    },
  ),
  When(
    '{textspec} is inserted at {placement}',
    (
      context: Context,
      textspec: Parameter['textspec'],
      placement: Parameter['placement'],
    ) => {
      const {blocks} = fromTextspec(
        {
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        textspec,
      )
      context.editor.send({
        type: 'insert.blocks',
        blocks,
        placement,
      })
    },
  ),
  When(
    '{textspec} is inserted at {placement} and selected at the {select-position}',
    (
      context: Context,
      textspec: Parameter['textspec'],
      placement: Parameter['placement'],
      selectPosition: Parameter['selectPosition'],
    ) => {
      const {blocks} = fromTextspec(
        {
          keyGenerator: context.editor.getSnapshot().context.keyGenerator,
          schema: context.editor.getSnapshot().context.schema,
        },
        textspec,
      )
      context.editor.send({
        type: 'insert.blocks',
        blocks,
        placement,
        select: selectPosition,
      })
    },
  ),
]
