/**
 * Renders `__fixtures__/wire-catalogue/*.json` into a markdown catalogue.
 *
 * Usage: `node scripts/generate-wire-catalogue.ts [outputPath]`
 * With no `outputPath`, the markdown goes to stdout: run through
 * `pnpm --silent wire-catalogue:markdown` to keep pnpm's own script-name
 * banner out of the output.
 */
import {execSync} from 'node:child_process'
import {readdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

type Patch = {
  type: string
  path: Array<unknown>
  [key: string]: unknown
}

type Capture = {
  scenario: string
  schema: Record<string, unknown>
  seed: string
  actions: Array<string>
  patches: Array<Patch>
  result: string
  proof?: string
}

type LegacyCapture = {
  scenario: string
  schema: Record<string, unknown>
  seed: Array<unknown>
  seedTerse: Array<string>
  actions: Array<string>
  patches: Array<Patch>
  resultTerse: Array<string>
  proof?: string
}

function isTextspecCapture(
  capture: Capture | LegacyCapture,
): capture is Capture {
  return typeof capture.seed === 'string'
}

const scriptDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(scriptDir, '../tests/__fixtures__/wire-catalogue')

const commit = execSync('git describe --always --dirty', {
  cwd: scriptDir,
})
  .toString()
  .trim()

const captures = readdirSync(fixturesDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => {
    // oxlint-disable-next-line no-restricted-globals -- standalone script outside the package's `safeStringify`/`safeParse` boundary, reading its own well-formed fixtures
    return JSON.parse(readFileSync(join(fixturesDir, file), 'utf8')) as
      | Capture
      | LegacyCapture
  })

const lines: Array<string> = []

lines.push('# Wire Catalogue')
lines.push('')
lines.push(`Generated from \`${commit}\`.`)
lines.push('')

for (const capture of captures) {
  lines.push(`## ${capture.scenario}`)
  lines.push('')
  if (isTextspecCapture(capture)) {
    lines.push('**Seed:**')
    lines.push('')
    lines.push('```text')
    lines.push(capture.seed)
    lines.push('```')
    lines.push('')
    lines.push('**Result:**')
    lines.push('')
    lines.push('```text')
    lines.push(capture.result)
    lines.push('```')
  } else {
    // oxlint-disable-next-line no-restricted-globals -- standalone script outside the package's `safeStringify`/`safeParse` boundary, rendering its own well-formed fixtures
    lines.push(`**Seed:** \`${JSON.stringify(capture.seedTerse)}\``)
    lines.push('')
    // oxlint-disable-next-line no-restricted-globals -- standalone script outside the package's `safeStringify`/`safeParse` boundary, rendering its own well-formed fixtures
    lines.push(`**Result:** \`${JSON.stringify(capture.resultTerse)}\``)
  }
  lines.push('')
  lines.push('**Actions:**')
  lines.push('')
  for (const action of capture.actions) {
    lines.push(`- ${action}`)
  }
  lines.push('')
  lines.push(`**Patches** (${capture.patches.length}):`)
  lines.push('')
  lines.push('```json')
  // oxlint-disable-next-line no-restricted-globals -- standalone script outside the package's `safeStringify`/`safeParse` boundary, rendering its own well-formed fixtures
  lines.push(JSON.stringify(capture.patches, null, 2))
  lines.push('```')
  lines.push('')
}

const markdown = `${lines.join('\n')}\n`
const outputPath = process.argv[2]

if (outputPath) {
  writeFileSync(outputPath, markdown)
} else {
  process.stdout.write(markdown)
}
