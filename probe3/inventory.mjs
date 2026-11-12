import {readFileSync, readdirSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(`${root}packages/racejar/package.json`)
const {
  AstBuilder,
  GherkinClassicTokenMatcher,
  Parser,
  compile,
} = require('@cucumber/gherkin')
const {IdGenerator} = require('@cucumber/messages')
const {
  CucumberExpression,
  ParameterTypeRegistry,
  ParameterType,
} = require('@cucumber/cucumber-expressions')
const registry = new ParameterTypeRegistry()
const parameters = readFileSync(
  `${root}packages/editor/src/test/gherkin-parameter-types.ts`,
  'utf8',
)
for (const match of parameters.matchAll(
  /name: '([^']+)',\s*matcher:\s*(\/[^\n]+\/[a-z]*)[,\n]/g,
)) {
  registry.defineParameterType(
    new ParameterType(
      match[1],
      Function(`return ${match[2]}`)(),
      String,
      (...values) => values[0],
      true,
      false,
    ),
  )
}
const source = readFileSync(
  `${root}packages/editor/src/test/vitest/step-definitions.tsx`,
  'utf8',
)
const definitions = [
  ...source.matchAll(/\b(Given|When|Then)\(\s*'([^']+)'/g),
].map((match, index, matches) => ({
  type: {Given: 'Context', When: 'Action', Then: 'Outcome'}[match[1]],
  pattern: match[2],
  expression: new CucumberExpression(match[2], registry),
  body: source.slice(match.index, matches[index + 1]?.index ?? source.length),
}))
export function pickles(text) {
  const id = IdGenerator.incrementing()
  const document = new Parser(
    new AstBuilder(id),
    new GherkinClassicTokenMatcher(),
  ).parse(text)
  return compile(document, 'feature', id)
}
export function route(step) {
  const definition = definitions.find(
    (candidate) =>
      candidate.type === step.type && candidate.expression.match(step.text),
  )
  if (!definition)
    return {
      route: 'Not drivable',
      reason: 'No desktop definition',
      pattern: step.text,
    }
  const {pattern, body} = definition
  if (
    /Editor B|two editors|pasted|cut is performed|drag|shortcut/.test(pattern)
  )
    return {
      route: 'Not drivable',
      reason: 'Clipboard, hardware, drag or two editors',
      pattern,
    }
  if (pattern === '{string} is typed') {
    const text = definition.expression.match(step.text)[0].getValue(null)
    const symbols = readFileSync(
      `${root}packages/thumbjar/src/gboard/symbols.ts`,
      'utf8',
    ).match(/TEXT_SYMBOLS = (\[[^\n]+\])/)[1]
    const supported = [
      ...readFileSync(
        `${root}packages/thumbjar/src/gboard/support.ts`,
        'utf8',
      ).match(/export const LETTERS = \[\.\.\.'([^']+)'\]/)[1],
      ...Function(`return ${symbols}`)(),
    ]
    return {
      route: [...text].every((character) => supported.includes(character))
        ? 'Gboard'
        : 'Not drivable',
      reason: 'compose text support (English)',
      pattern,
    }
  }
  if (pattern.startsWith('{button}')) {
    const supported =
      /^"\{(?:Enter|Backspace)\}" is pressed(?: [1-9]\d* times)?$/.test(
        step.text,
      )
    return {
      route: supported ? 'Gboard' : 'Not drivable',
      reason: 'Gboard has Enter and Backspace only',
      pattern,
    }
  }
  if (/userEvent\.(keyboard|type|cut)|clipboard\./.test(body))
    return {route: 'Not drivable', reason: 'Hardware or clipboard', pattern}
  return {
    route: 'Page',
    reason:
      step.type === 'Outcome'
        ? 'Page state assertion'
        : 'Editor setup, selection or editor.send',
    pattern,
  }
}
export function inventory() {
  return readdirSync(`${root}packages/editor/gherkin-spec`)
    .filter((file) => file.endsWith('.feature'))
    .map((file) => {
      const text = readFileSync(
        `${root}packages/editor/gherkin-spec/${file}`,
        'utf8',
      )
      const rows = pickles(text).map((pickle) => ({
        ...pickle,
        routes: pickle.steps.map(route),
      }))
      return {
        file,
        scenarios: (text.match(/^\s*Scenario(?: Outline)?:/gm) ?? []).length,
        rows,
      }
    })
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const features = inventory()
  let output =
    '# Device inventory\n\nEnglish Gboard support is read from `symbols.ts`; letter support follows `support.ts`. Rows include expanded Outline examples and Background steps. Page includes assertions. Existing `@skip` tags do not affect route counts.\n\n| Feature | Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |\n| --- | ---: | ---: | ---: | ---: |\n'
  for (const {file, scenarios, rows} of features) {
    const drivable = rows.filter((row) =>
      row.routes.every((step) => step.route !== 'Not drivable'),
    )
    output += `| ${file} | ${scenarios} | ${rows.length} | ${drivable.length} | ${drivable.filter((row) => row.routes.some((step) => step.route === 'Gboard')).length} |\n`
  }
  output += '\n## Every used step text\n'
  for (const {file, scenarios, rows} of features) {
    const drivable = rows.filter((row) =>
      row.routes.every((step) => step.route !== 'Not drivable'),
    )
    output += `\n### ${file}\n\n| Scenarios / outlines | Expanded rows | Fully drivable | With Gboard |\n| ---: | ---: | ---: | ---: |\n| ${scenarios} | ${rows.length} | ${drivable.length} | ${drivable.filter((row) => row.routes.some((step) => step.route === 'Gboard')).length} |\n\n| Step type and text | Route | Definition / reason |\n| --- | --- | --- |\n`
    const seen = new Set()
    for (const row of rows)
      for (const [index, step] of row.steps.entries()) {
        const key = `${step.type}: ${step.text}`
        if (seen.has(key)) continue
        seen.add(key)
        const result = row.routes[index]
        const cell = (value) =>
          value.replaceAll('|', '\\|').replaceAll('\n', ' ')
        output += `| ${cell(key)} | ${result.route} | ${cell(result.pattern)} — ${result.reason} |\n`
      }
  }
  writeFileSync(`${root}probe3/inventory.md`, output)
}
