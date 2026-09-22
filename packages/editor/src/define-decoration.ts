import type {Decoration} from './types/editor'

/**
 * An identity helper in the `defineSchema`/`defineDecorator` tradition:
 * contextual typing and autocomplete for a `Decoration` literal without
 * annotating it yourself. Accepts every member of the `Decoration`
 * union. Unrelated to `defineDecorator`, which defines a schema mark
 * like `strong`; a `Decoration` is an ephemeral visual layer entry for
 * `editor.registerDecorations`.
 * @beta
 */
export function defineDecoration(decoration: Decoration): Decoration {
  return decoration
}
