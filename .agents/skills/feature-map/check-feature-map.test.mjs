import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {after, describe, test} from 'node:test'
import {checkFeatureMap, runCheck} from './check-feature-map.mjs'

const repoRoots = []

after(() => {
  for (const repoRoot of repoRoots) {
    fs.rmSync(repoRoot, {recursive: true, force: true})
  }
})

describe(checkFeatureMap.name, () => {
  test('passes when every path exists', () => {
    const repoRoot = createRepo([
      'packages/foo/src/index.ts',
      'apps/bar/README.md',
      '.agents/skills/baz/SKILL.md',
      '.github/workflows/baz.yml',
    ])

    assert.deepEqual(
      checkFeatureMap({
        markdown: [
          '- Source: `packages/foo/src/index.ts`, `apps/bar/README.md`',
          '- Skill: `.agents/skills/baz/SKILL.md`, `.github/workflows/baz.yml`',
        ].join('\n'),
        repoRoot,
      }),
      {
        paths: [
          'packages/foo/src/index.ts',
          'apps/bar/README.md',
          '.agents/skills/baz/SKILL.md',
          '.github/workflows/baz.yml',
        ],
        globs: [],
        missing: [],
      },
    )
  })

  test('reports a missing path', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])

    assert.deepEqual(
      checkFeatureMap({
        markdown: '`packages/foo/src/index.ts` and `packages/foo/src/bar.ts`',
        repoRoot,
      }),
      {
        paths: ['packages/foo/src/index.ts', 'packages/foo/src/bar.ts'],
        globs: [],
        missing: ['packages/foo/src/bar.ts'],
      },
    )
  })

  test('reports a path with a line suffix as missing', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])

    assert.deepEqual(
      checkFeatureMap({markdown: '`packages/foo/src/index.ts:38`', repoRoot}),
      {
        paths: ['packages/foo/src/index.ts:38'],
        globs: [],
        missing: ['packages/foo/src/index.ts:38'],
      },
    )
  })

  test('reports a glob instead of checking it', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])

    assert.deepEqual(
      checkFeatureMap({markdown: '`packages/foo/src/*.ts`', repoRoot}),
      {
        paths: ['packages/foo/src/*.ts'],
        globs: ['packages/foo/src/*.ts'],
        missing: [],
      },
    )
  })

  test('lists a repeated path once', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])

    assert.deepEqual(
      checkFeatureMap({
        markdown: '`packages/foo/src/index.ts` and `packages/foo/src/index.ts`',
        repoRoot,
      }),
      {paths: ['packages/foo/src/index.ts'], globs: [], missing: []},
    )
  })

  test('reports every glob character', () => {
    const repoRoot = createRepo([])

    assert.deepEqual(
      checkFeatureMap({
        markdown:
          '`packages/a/*.ts`, `packages/b/?.ts`, `packages/c/[ab].ts`, `packages/d/{a,b}.ts`',
        repoRoot,
      }),
      {
        paths: [
          'packages/a/*.ts',
          'packages/b/?.ts',
          'packages/c/[ab].ts',
          'packages/d/{a,b}.ts',
        ],
        globs: [
          'packages/a/*.ts',
          'packages/b/?.ts',
          'packages/c/[ab].ts',
          'packages/d/{a,b}.ts',
        ],
        missing: [],
      },
    )
  })

  test('checks a `./` root file', () => {
    const repoRoot = createRepo(['AGENTS.md'])

    assert.deepEqual(
      checkFeatureMap({markdown: '`./AGENTS.md` and `./CLAUDE.md`', repoRoot}),
      {
        paths: ['./AGENTS.md', './CLAUDE.md'],
        globs: [],
        missing: ['./CLAUDE.md'],
      },
    )
  })

  test('checks a directory with or without a trailing slash', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])

    assert.deepEqual(
      checkFeatureMap({
        markdown:
          '`packages/foo/src/`, `packages/foo/src`, `packages/foo/lib/`, `packages/foo/lib`',
        repoRoot,
      }),
      {
        paths: [
          'packages/foo/src/',
          'packages/foo/src',
          'packages/foo/lib/',
          'packages/foo/lib',
        ],
        globs: [],
        missing: ['packages/foo/lib/', 'packages/foo/lib'],
      },
    )
  })

  test('only checks tokens written from the repo root', () => {
    const repoRoot = createRepo([])

    assert.deepEqual(
      checkFeatureMap({
        markdown: [
          '`src/editor/`, `tests/foo.test.tsx`, `../foo/bar.ts`, `packagesfoo/bar.ts`,',
          '`@portabletext/html`, `text/html`, `https://example.com/foo.html`,',
          '`packages`, `foo.ts`, `insert.soft break`',
        ].join('\n'),
        repoRoot,
      }),
      {paths: [], globs: [], missing: []},
    )
  })
})

describe(runCheck.name, () => {
  test('exits 0 and reports the count when every path exists', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])
    const output = []

    assert.equal(
      runCheck({
        markdown: '`packages/foo/src/index.ts`',
        repoRoot,
        label: 'SKILL.md',
        log: (line) => output.push(['log', line]),
        error: (line) => output.push(['error', line]),
      }),
      0,
    )
    assert.deepEqual(output, [['log', 'All 1 paths in SKILL.md exist.']])
  })

  test('exits 1 and names each missing path and glob', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])
    const output = []

    assert.equal(
      runCheck({
        markdown:
          '`packages/foo/src/index.ts`, `packages/foo/src/bar.ts`, `packages/foo/*.ts`',
        repoRoot,
        label: 'SKILL.md',
        log: (line) => output.push(['log', line]),
        error: (line) => output.push(['error', line]),
      }),
      1,
    )
    assert.deepEqual(output, [
      ['error', 'Glob, not a path: packages/foo/*.ts'],
      ['error', 'Missing: packages/foo/src/bar.ts'],
      ['error', '\n2 of 3 paths in SKILL.md need fixing.'],
    ])
  })

  test('exits 1 on a missing path alone', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])
    const output = []

    assert.equal(
      runCheck({
        markdown: '`packages/foo/src/index.ts`, `packages/foo/src/bar.ts`',
        repoRoot,
        label: 'SKILL.md',
        log: (line) => output.push(['log', line]),
        error: (line) => output.push(['error', line]),
      }),
      1,
    )
    assert.deepEqual(output, [
      ['error', 'Missing: packages/foo/src/bar.ts'],
      ['error', '\n1 of 2 paths in SKILL.md need fixing.'],
    ])
  })

  test('exits 1 on a glob alone', () => {
    const repoRoot = createRepo(['packages/foo/src/index.ts'])
    const output = []

    assert.equal(
      runCheck({
        markdown: '`packages/foo/src/index.ts`, `packages/foo/*.ts`',
        repoRoot,
        label: 'SKILL.md',
        log: (line) => output.push(['log', line]),
        error: (line) => output.push(['error', line]),
      }),
      1,
    )
    assert.deepEqual(output, [
      ['error', 'Glob, not a path: packages/foo/*.ts'],
      ['error', '\n1 of 2 paths in SKILL.md need fixing.'],
    ])
  })

  test('exits 1 when no paths are found', () => {
    const repoRoot = createRepo([])
    const output = []

    assert.equal(
      runCheck({
        markdown: 'No paths here.',
        repoRoot,
        label: 'SKILL.md',
        log: (line) => output.push(['log', line]),
        error: (line) => output.push(['error', line]),
      }),
      1,
    )
    assert.deepEqual(output, [
      [
        'error',
        'No repo-relative paths found in SKILL.md. The extraction is broken or the map is empty.',
      ],
    ])
  })
})

function createRepo(files) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-'))
  repoRoots.push(repoRoot)

  for (const file of files) {
    const filePath = path.join(repoRoot, file)
    fs.mkdirSync(path.dirname(filePath), {recursive: true})
    fs.writeFileSync(filePath, '')
  }

  return repoRoot
}
