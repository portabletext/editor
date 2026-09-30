---
'@portabletext/plugin-typography': patch
---

fix: default `TypographyPluginProps` rule names to every rule instead of `never`

`TypographyPluginProps` used without type arguments now accepts any typography rule name in `enable` and `disable`, and still rejects names that are not rules. Previously both arrays were typed `ReadonlyArray<never>`, so annotating a config object with the type (as Sanity Studio's `portableText.plugins.typography` option does) failed to compile for every rule name. Props typed this way can also be spread onto `<TypographyPlugin>`. Passing literal `enable` and `disable` arrays to `<TypographyPlugin>` still rejects a rule that appears in both, unless `enable` lists every rule.
