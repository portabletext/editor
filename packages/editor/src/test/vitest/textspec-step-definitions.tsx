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
 */
export const textspecStepDefinitions = [
  Given(
    'the editor state is {textspec}',
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
    'the editor state is {textspec}',
    async (context: Context, textspec: Parameter['textspec']) => {
      await vi.waitFor(() => {
        expect(
          toTextspec(context.editor.getSnapshot().context),
          'Unexpected editor state',
        ).toBe(textspec)
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
