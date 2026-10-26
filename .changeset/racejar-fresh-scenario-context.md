---
'racejar': patch
---

fix: give each scenario a fresh context

Every scenario in a feature now starts with an empty context object. Before, all scenarios in a feature shared one object, so a value a step wrote in one scenario was still there in the next. A scenario could pass only because an earlier scenario left state behind, and the order of the scenarios could change the results. Suites that set up their state in a `Background` or a `Before` hook are unaffected.
