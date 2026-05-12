import {parameterTypes} from '@portabletext/editor/test'
import {
  createTestEditor,
  stepDefinitions,
  type Context,
} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {Before} from 'racejar'
import {Feature} from 'racejar/vitest'
import flagPreservationFeature from './flag-preservation.feature?raw'
import {InputRulePlugin} from './plugin.input-rule'
import {defineTextTransformRule} from './text-transform-rule'

// Case-insensitive rule. Without preserving `i`, only the lowercase trigger
// matches. With `i` preserved, uppercase and mixed-case also trigger.
// The rule rewrites the bracket-wrapped trigger to a plain marker so the
// firing is observable from the rendered text.
const caseInsensitiveRule = defineTextTransformRule({
  on: /\[!note\]/i,
  transform: () => 'NOTE',
})

// Unicode rule. The pattern `\p{L}+!` uses a Unicode property escape that
// requires the `u` flag at construction time, otherwise `new RegExp`
// throws. Preserving `u` lets the rule match Unicode letters followed by
// `!`. The pattern has no capture group, so the full match is the target.
const unicodeRule = defineTextTransformRule({
  on: /\p{L}+!/u,
  transform: () => 'HIT',
})

// Rule with user-set `g` flag. The plugin already drives its own `matchAll`
// loop; user-set `g` is redundant. The fix strips it so the rebuilt regex
// flags stay valid.
const userGRule = defineTextTransformRule({
  on: /\(c\)/g,
  transform: () => 'GMARK',
})

// Rule with user-set `d` flag. The plugin sets `d` itself to read indices.
// User-set `d` is redundant and must be stripped to avoid `Invalid flags`.
const userDRule = defineTextTransformRule({
  on: /\(d\)/d,
  transform: () => 'DMARK',
})

// Rule with sticky (`y`) flag. Sticky semantics conflict with the plugin's
// `matchAll` loop, which slices `newText` and re-feeds it. With `y`
// preserved, the regex only matches at `lastIndex`, breaking any match
// that isn't at position 0 of the current slice. Stripping `y` keeps the
// loop's intent: match the pattern anywhere in the remaining text.
const userYRule = defineTextTransformRule({
  on: /foo/y,
  transform: () => 'YMARK',
})

// Bare pattern, no consumer flags. Pins that the historical contract
// continues to work.
const bareRule = defineTextTransformRule({
  on: /\[!plain\]/,
  transform: () => 'PLAIN',
})

// Case-insensitive rule with a capture group. `defineTextTransformRule`
// replaces only the captured group when groups are present, so the
// transform fires on the captured trigger (`yes` / `YES` / `No`) and
// the surrounding angle brackets remain. This pins that `i` flows
// through the group-match path, not just the full-match path.
const groupCaseInsensitiveRule = defineTextTransformRule({
  on: /<<(yes|no)>>/i,
  transform: () => 'GHIT',
})

// Unicode rule with a capture group. `@(\p{L}+)` captures one or more
// Unicode letters after `@`; the transform replaces just the capture,
// leaving the `@` in place. Pins that `u` flows into group matching.
// The `@` prefix keeps this pattern from overlapping the full-match
// unicode rule above.
const groupUnicodeRule = defineTextTransformRule({
  on: /@(\p{L}+)\b/u,
  transform: () => 'UHIT',
})

// Sticky rule with a capture group. With `y` preserved, the match anchors
// at `lastIndex` 0 and never fires for `jamsession` at offset 3 of
// `xxxjamsession`. Stripping `y` lets the match find `jamsession`,
// capture `jam`, and replace just the capture - leaving `xxx` and
// `session` intact.
const groupStickyRule = defineTextTransformRule({
  on: /(jam)session/y,
  transform: () => 'YHIT',
})

Feature({
  hooks: [
    Before(async (context: Context) => {
      const {editor, locator} = await createTestEditor({
        children: (
          <>
            <InputRulePlugin rules={[caseInsensitiveRule]} />
            <InputRulePlugin rules={[unicodeRule]} />
            <InputRulePlugin rules={[userGRule]} />
            <InputRulePlugin rules={[userDRule]} />
            <InputRulePlugin rules={[userYRule]} />
            <InputRulePlugin rules={[bareRule]} />
            <InputRulePlugin rules={[groupCaseInsensitiveRule]} />
            <InputRulePlugin rules={[groupUnicodeRule]} />
            <InputRulePlugin rules={[groupStickyRule]} />
          </>
        ),
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
        }),
      })

      context.locator = locator
      context.editor = editor
    }),
  ],
  featureText: flagPreservationFeature,
  stepDefinitions,
  parameterTypes,
})
