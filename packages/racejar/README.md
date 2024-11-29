# `racejar`

> A testing framework agnostic [Gherkin](https://cucumber.io/docs/gherkin/reference/) driver

`racejar` is a thin wrapper around `@cucumber/*` that allows you to write your tests in Gherkin and run them with [Vitest](https://vitest.dev/), [Jest](https://jestjs.io/) or any other testing framework of your choice.

```sh
pnpm add --save-dev racejar
```

## Usage with Vitest

Using `racejar` with Vitest requires no additional configuration. Just drop it into a new or an existing test file and get going:

```ts
// your.test.ts

// Import `Feature` from `racejar/vitest`
import {Feature} from 'racejar/vitest'
// Import your raw `.feature` file
import featureFile from './your.feature?raw'

// Run the feature
Feature({
  featureText: featureFile,
  stepDefinitions: [
    // ...
  ],
  parameterTypes: [
    // ...
  ],
})
```

## Usage with Jest

Using `racejar` with Jest is similar to Vitest. Just import `Feature` from `racejar/jest` instead.

However, Jest can't import raw files out of the box. You'll need a transformer. Luckily, it's easy to write and configure a simple one:

```ts
// jest.config.ts

import type {Config} from 'jest'

const config: Config = {
  transform: {
    '\\.feature$': '<rootDir>/feature-file-transformer.js',
  },
}
```

```js
// feature-file-transformer.js

module.exports = {
  process(content) {
    return {
      code: `module.exports = ${JSON.stringify(content)};`,
    }
  },
}
```

## Usage with \<your favourite testing framework\>

`Feature` exported from `racejar/vitest` and `racejar/jest` are convenient thin wrappers around the more generic `compileFeature`.

If you are unhappy with those wrappers or want to use `racejar` with another framework, then you can compile your feature manually and run your tests using the compiled feature:

```ts
import {compileFeature} from 'racejar'

const feature = compileFeature({
  featureText: featureFile,
  stepDefinitions: [
    // ...
  ],
  parameterTypes: [
    // ...
  ],
})

for (const scenario of feature.scenarios) {
  // ...
}
```

## Define Steps and Parameter Types

`stepDefinitions` can be defined inline or separately. They are defined using `Given`, `When`, `Then` exported from `racejar`:

```ts
import {Given, Then, When} from 'racejar'

const stepDefinitions = [Given(/* ... */), When(/* ... */), Then(/* ... */)]
```

`racejar` will error out and inform you if a step definition is missing or if you accidentally defined duplicate definitions.

If you use nonstandard parameter types, then you can define them yourself:

```ts
import {createParameterType} from 'racejar'

const parameterTypes = [createParameterType(/* ... */)]
```

## Basic Example

```ts
import {Given, Then, When} from 'racejar'
import {Feature} from 'racejar/vitest'
import {expect} from 'vitest'

function greet(name: string) {
  return `Hello, ${name}!`
}

type Context = {
  person: string
  greeting: string
}

Feature({
  featureText: `
    Feature: Greeting
      Scenario: Greeting a person
        Given the person "Herman"
        When greeting the person
        Then the greeting is "Hello, Herman!"`,
  stepDefinitions: [
    Given<Context, string>('the person {string}', (context, person) => {
      context.person = person
    }),
    When<Context>('greeting the person', (context) => {
      context.greeting = greet(context.person)
    }),
    Then<Context, string>('the greeting is {string}', (context, greeting) => {
      expect(context.greeting).toBe(greeting)
    }),
  ],
})
```

## Advanced Example

The following example is taken from the [`editor`](/packages/editor/) package in this repository. For a full example of how to use `racejar`, head over to [/packages/editor/gherkin-tests/](/packages/editor/gherkin-tests/). The package uses `racejar` to run a [Playwright](https://playwright.dev/) E2E test suite powered by [Vitest Browser Mode](https://vitest.dev/guide/browser/).

This feature file tests that the editor can annotate text and additionally asserts the text selection after an annotation is applied. It uses 7 steps which need to be defined:

```gherkin
// annotations.feature

Feature: Annotations

  Background:
    Given one editor
    And a global keymap

  Scenario: Selection after adding an annotation
    Given the text "foo bar baz"
    When "bar" is selected
    And "link" "l1" is toggled
    Then "bar" has marks "l1"
    And "bar" is selected
```

Here's a rough idea of how these steps can be defined:

```tsx
import {Given, Then, When} from 'racejar'

// A `context` object is passed around between steps
// The context can be whatever you want it to be
type Context = {
  locator: Locator
  keyMap: Map<string, string>
}

export const stepDefinitions = [
  Given('one editor', async (context: Context) => {
    render(<Editor />)
    const locator = page.getByTestId('<editor test ID>')
    context.locator = locator
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  }),
  Given('a global keymap', (context: Context) => {
    context.keyMap = new Map()
  }),
  Given('the text {string}', async (context: Context, text: string) => {
    await userEvent.click(context.locator)
    await userEvent.type(context.locator, text)
  }),
  Given('{string} is selected', async (context: Context, text: string) => {
    // Select `text` in the editor
  }),
  When(
    '{annotation} {keys} is toggled',
    async (
      context: Context,
      annotation: 'comment' | 'link',
      keyKeys: Array<string>,
    ) => {
      // Toggle the `annotation` and store the resulting keys on the `context.keyMap`
    },
  ),
  Then(
    '{string} has marks {marks}',
    async (context: Context, text: string, marks: Array<string>) => {
      // Get the actual marks on the `text` and compare them with `marks`
    },
  ),
  Then('{text} is selected', async (context: Context, text: Array<string>) => {
    // Assert that the current editor selection matches `text`
  }),
]
```

As you can see, the step definitions declare a few custom parameters, `{annotation}`, `{keys}` and `{text}`:

```ts
import {createParameterType} from 'racejar'

export const parameterTypes = [
  createParameterType({
    name: 'annotation',
    matcher: /"(comment|link)"/,
  }),
  createParameterType({
    name: 'keys',
    matcher: /"(([a-z]\d)(,([a-z]\d))*)"/,
    type: Array,
    transform: (input) => input.split(','),
  }),
  createParameterType({
    name: 'text',
    matcher: /"([a-z-,#>\\n |\[\]]*)"/,
    type: Array,
    transform: parseGherkinTextParameter,
  }),
]

function parseGherkinTextParameter(text: string) {
  return text
    .replace(/\|/g, ',|,')
    .split(',')
    .map((span) => span.replace(/\\n/g, '\n'))
}
```

Now, let's run the test using our defined steps and custom parameter types:

```ts
// annotations.test.ts

import annotationsFeature from './annotations.feature?raw'
import {parameterTypes} from './parameter-types'
import {stepDefinitions} from './step-definitions'

Feature({
  featureText: annotationsFeature,
  stepDefinitions,
  parameterTypes,
})
```

## Tips

If TypeScript errors out with `Cannot find module '.your.feature?raw' or its corresponding type declarations.` then you can declare `.*feature?raw` files as modules:

```ts
// global.d.ts

declare module '*.feature?raw' {
  const content: string
  export default content
}
```

---

Use [prettier-plugin-gherkin](https://github.com/mapado/prettier-plugin-gherkin) to automatically format your `.feature` files.

```json
// .prettierrc

{
  "plugins": ["prettier-plugin-gherkin"]
}
```
