/**
 * Type-checks the TypeScript and JavaScript examples in the docs site, the
 * package READMEs and JSDoc `@example` blocks against the workspace packages.
 *
 * Usage: `node src/check.ts [--list] [path...]`
 * `--list` prints every fence with its status instead of only the failures.
 * `path` limits the check to sources whose repo-relative path starts with it.
 */
import {spawnSync} from 'node:child_process'
import {mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {
  collectFences,
  continuationMarker,
  optOutMarker,
  type Fence,
  type Surface,
} from './extract.ts'

type Diagnostic = {fence: Fence; source: string; line: number; message: string}

/**
 * A fence checked as one program together with the fences it continues. Each
 * line of the program maps back to the fence it came from.
 */
type Program = {
  fence: Fence
  lines: Array<{fence: Fence; line: number}>
  code: string
  extension: string
}

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageRoot, '../..')
const runRoot = join(packageRoot, 'generated', String(process.pid))

const filters = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const fences = collectFences(repoRoot).filter(
  (fence) =>
    filters.length === 0 ||
    filters.some((filter) => fence.source.startsWith(filter)),
)

// JavaScript readers never write type annotations, so JavaScript programs
// are checked without `noImplicitAny`. That is a per-program option, so they
// form a second tsc project.
const projects = {
  ts: join(runRoot, 'ts'),
  js: join(runRoot, 'js'),
}
rmSync(runRoot, {recursive: true, force: true})
for (const [kind, directory] of Object.entries(projects)) {
  mkdirSync(directory, {recursive: true})
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      extends: '../../../tsconfig.examples.json',
      compilerOptions: kind === 'js' ? {noImplicitAny: false} : {},
      include: ['.'],
    }),
  )
}

const programs = new Map<string, Program>()
const programByFence = new Map<Fence, Program>()
fences.forEach((fence, index) => {
  if (fence.skipped) {
    return
  }
  const program = toProgram(fence, index)
  programByFence.set(fence, program)
  const name = join(
    projectOf(program),
    `${String(index).padStart(4, '0')}.${program.extension}`,
  )
  programs.set(name, program)
  writeFileSync(name, `${program.code}\n`)
})

// Once any file in a program has a syntax error, tsc reports only syntax
// errors, so a single broken fence would hide every type error elsewhere.
// Parse first and type-check only the fences that parse.
const results = Object.values(projects).flatMap((project) => {
  const inProject = [...programs].filter(([name]) => dirname(name) === project)
  if (inProject.length === 0) {
    return []
  }
  const syntax = runTsc(project, ['--noCheck'])
  const syntaxFailures = new Set(syntax.diagnostics.map(({fence}) => fence))
  for (const [name, program] of inProject) {
    if (syntaxFailures.has(program.fence)) {
      rmSync(name)
    }
  }
  return syntaxFailures.size === inProject.length
    ? [syntax]
    : [syntax, runTsc(project, [])]
})
rmSync(runRoot, {recursive: true, force: true})

const diagnostics = results.flatMap((result) => result.diagnostics)
const unmapped = results.flatMap((result) => result.unmapped)
const failing = new Set(diagnostics.map(({fence}) => fence))

if (process.argv.includes('--list')) {
  for (const fence of fences) {
    const status = fence.skipped ? 'skip' : failing.has(fence) ? 'FAIL' : 'pass'
    const marker = fence.continues ? ` (${continuationMarker})` : ''
    console.log(
      `${status} ${fence.surface} ${fence.source}:${fence.line}${marker}`,
    )
  }
}

for (const diagnostic of diagnostics) {
  const location = `${diagnostic.source}:${diagnostic.line}`
  const owner = `${diagnostic.fence.source}:${diagnostic.fence.line}`
  const context =
    diagnostic.source === diagnostic.fence.source &&
    diagnostic.line >= diagnostic.fence.line
      ? ''
      : ` (in the program of the \`${continuationMarker}\` fence at ${owner})`
  console.error(`${location}: ${diagnostic.message}${context}`)
}
for (const output of unmapped) {
  console.error(output)
}

const surfaces: Array<Surface> = ['docs', 'readme', 'jsdoc']
for (const surface of surfaces) {
  const inSurface = fences.filter((fence) => fence.surface === surface)
  const skipped = inSurface.filter((fence) => fence.skipped).length
  const failed = inSurface.filter((fence) => failing.has(fence)).length
  console.log(
    `${surface}: ${inSurface.length} fences, ${inSurface.length - skipped - failed} pass, ${failed} fail, ${skipped} skipped`,
  )
}

if (failing.size > 0 || unmapped.length > 0) {
  console.error(
    `\n${failing.size} example(s) fail to type-check. Fix the example, mark a snippet that builds on the previous example with \`${continuationMarker}\`, or mark a deliberate fragment with \`${optOutMarker}\` after the fence language.`,
  )
  process.exit(1)
}

/**
 * A `continue` fence is prefixed with the program of the nearest earlier
 * checked fence in the same file, so a chain of them accumulates.
 */
function toProgram(fence: Fence, index: number): Program {
  const ownLines = fence.code
    .split('\n')
    .map((_, offset) => ({fence, line: fence.line + offset}))
  const previous = fence.continues
    ? fences
        .slice(0, index)
        .findLast(
          (candidate) =>
            candidate.source === fence.source &&
            candidate.surface === fence.surface &&
            !candidate.skipped,
        )
    : undefined
  const prefix = previous ? programByFence.get(previous) : undefined

  if (!prefix) {
    return {fence, lines: ownLines, code: fence.code, extension: fence.language}
  }

  const languages = new Set([prefix.extension, fence.language])
  const typescript = languages.has('ts') || languages.has('tsx')
  const jsx = languages.has('tsx') || languages.has('jsx')
  return {
    fence,
    lines: [...prefix.lines, ...ownLines],
    code: `${prefix.code}\n${fence.code}`,
    extension: typescript ? (jsx ? 'tsx' : 'ts') : jsx ? 'jsx' : 'js',
  }
}

function projectOf(program: Program): string {
  return program.extension === 'js' || program.extension === 'jsx'
    ? projects.js
    : projects.ts
}

function runTsc(
  project: string,
  flags: Array<string>,
): {
  diagnostics: Array<Diagnostic>
  unmapped: Array<string>
} {
  const tsc = spawnSync(
    join(packageRoot, 'node_modules/.bin/tsc'),
    [
      '--project',
      join(project, 'tsconfig.json'),
      '--pretty',
      'false',
      ...flags,
    ],
    {cwd: packageRoot, encoding: 'utf8'},
  )
  if (tsc.error) {
    throw tsc.error
  }

  const diagnostics: Array<Diagnostic> = []
  const unmapped: Array<string> = []
  for (const output of `${tsc.stdout}${tsc.stderr}`.split('\n')) {
    if (output.trim() === '') {
      continue
    }
    const previous = diagnostics.at(-1)
    if (/^\s/.test(output) && previous) {
      previous.message += `\n${output}`
      continue
    }
    const match = /^(.+?)\((\d+),\d+\): (error TS\d+: .*)$/.exec(output)
    const program = match
      ? programs.get(join(packageRoot, match[1] ?? ''))
      : undefined
    // A diagnostic at the end of the file lands on the trailing newline.
    const origin =
      program?.lines[Math.min(Number(match?.[2]), program.lines.length) - 1]
    if (match && program && origin) {
      diagnostics.push({
        fence: program.fence,
        source: origin.fence.source,
        line: origin.line,
        message: match[3] ?? '',
      })
    } else {
      unmapped.push(output)
    }
  }
  if (tsc.status !== 0 && diagnostics.length === 0 && unmapped.length === 0) {
    unmapped.push(`tsc exited with status ${tsc.status} and no diagnostics`)
  }
  return {diagnostics, unmapped}
}
