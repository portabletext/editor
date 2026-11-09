import type {EditorContext} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {getPathSubSchema} from '@portabletext/editor/traversal'
import {defineInputRule} from '@portabletext/plugin-input-rule'
import {createCharacterPairRegex} from './regex.character-pair'

/**
 * A character pair is an input rule: typing the closing half of a pair
 * (`**bold**`, `_em_`) decorates the content between the markers and deletes
 * the markers. `defineInputRule` supplies the match locations; the
 * `InputRulePlugin` machinery supplies smart-undo on Backspace and the
 * caret-departure tracking the plugin previously hand-rolled.
 */
export function createCharacterPairRule(config: {
  decorator: ({
    context,
  }: {
    context: Pick<EditorContext, 'schema'>
  }) => string | undefined
  pair: {char: string; amount: number}
}) {
  if (config.pair.amount < 1) {
    console.warn(
      `The amount of characters in the pair should be greater than 0`,
    )
  }

  const pairRegex = createCharacterPairRegex(
    config.pair.char,
    config.pair.amount,
  )

  return defineInputRule({
    // `$`-anchored: the pair must close at the insertion point, so at most
    // one match fires per insert.
    on: new RegExp(`${pairRegex}$`),
    // A pair only deletes its markers, so a match whose CONTENT spans an
    // inline object is harmless and must decorate (`**bo`, insert an
    // object, `ld**`). An inline object anywhere else in the match, between
    // the marker characters, means this is not a pair, and the machinery
    // drops the match.
    inlineObjects: {allow: ['content']},
    guard: ({snapshot, event}) => {
      if (config.pair.amount < 1) {
        return false
      }

      const subSchema = getPathSubSchema(snapshot, event.focusBlock.path)
      const decorator = config.decorator({
        context: {schema: subSchema},
      })

      if (decorator === undefined) {
        return false
      }

      const match = event.matches.at(0)

      if (!match) {
        return false
      }

      // `createCharacterPairRegex` captures the content between the markers
      // as the named group `content`. Prefix and suffix offsets derive from
      // the whole match and the content group.
      const content = match.groups['content']

      if (!content) {
        return false
      }

      const prefixOffsets = {
        anchor: match.targetOffsets.anchor,
        focus: content.targetOffsets.anchor,
      }
      const suffixOffsets = {
        anchor: content.targetOffsets.focus,
        focus: match.targetOffsets.focus,
      }

      return {
        decorator,
        contentOffsets: {
          anchor: content.targetOffsets.anchor,
          focus: content.targetOffsets.focus,
        },
        prefixOffsets,
        suffixOffsets,
      }
    },
    actions: [
      (_, {decorator, contentOffsets, prefixOffsets, suffixOffsets}) => [
        // Decorate the text between the prefix and suffix
        raise({
          type: 'decorator.add',
          decorator,
          at: contentOffsets,
        }),
        // Delete the suffix, then the prefix (suffix first so the prefix
        // offsets stay valid)
        raise({
          type: 'delete.text',
          at: suffixOffsets,
        }),
        raise({
          type: 'delete.text',
          at: prefixOffsets,
        }),
        // Toggle the decorator off so the next inserted text isn't decorated
        raise({
          type: 'decorator.remove',
          decorator,
        }),
      ],
    ],
  })
}
