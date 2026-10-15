import {describe, test} from 'vitest'
import {TypographyPlugin, type TypographyPluginProps} from './plugin.typography'

describe(TypographyPlugin.name, () => {
  describe('`TypographyPluginProps` without type arguments', () => {
    test('accepts rule names in `enable` and `disable`', () => {
      const props: TypographyPluginProps = {
        enable: ['oneQuarter', 'threeQuarters'],
        disable: ['openingDoubleQuote', 'closingDoubleQuote'],
      }

      void props
    })

    test('rejects unknown rule names', () => {
      const props: TypographyPluginProps = {
        // @ts-expect-error - not a typography rule
        enable: ['foo'],
        // @ts-expect-error - not a typography rule
        disable: ['bar'],
      }

      void props
    })

    test('can be spread onto `TypographyPlugin`', () => {
      const props: TypographyPluginProps = {
        enable: ['oneQuarter'],
        disable: ['emDash'],
      }

      void (<TypographyPlugin {...props} />)
    })
  })

  describe('`TypographyPluginProps` with type arguments', () => {
    test('accepts a disabled rule disjoint from generic enabled rules', () => {
      function wrap<TEnabledRuleName extends 'emDash' | 'ellipsis'>(
        props: TypographyPluginProps<TEnabledRuleName, 'oneHalf'>,
      ) {
        return props
      }

      void wrap
    })

    test('rejects a disabled rule overlapping generic enabled rules', () => {
      function wrap<TEnabledRuleName extends 'emDash' | 'ellipsis'>(
        // @ts-expect-error - `emDash` may be enabled
        props: TypographyPluginProps<TEnabledRuleName, 'emDash'>,
      ) {
        return props
      }

      void wrap
    })

    test('disables no rules when only enabled rules are given', () => {
      const props: TypographyPluginProps<'emDash'> = {enable: ['emDash']}
      const exact: TypographyPluginProps<'emDash', never> = props

      void exact
    })
  })

  describe('`TypographyPlugin`', () => {
    test('accepts disjoint `enable` and `disable`', () => {
      void (<TypographyPlugin enable={['oneQuarter']} disable={['emDash']} />)
    })

    test('accepts `disable` alone', () => {
      void (<TypographyPlugin disable={['emDash']} />)
    })

    test('rejects a rule in both `enable` and `disable`', () => {
      // @ts-expect-error - `emDash` cannot be both enabled and disabled
      void (<TypographyPlugin enable={['emDash']} disable={['emDash']} />)
    })
  })
})
