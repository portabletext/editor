import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
  annotateChangelog,
  movedPublishedRange,
} from './annotate-lockstep-releases.mjs'

const releasedVersions = new Map([
  ['@portabletext/editor', '8.1.3'],
  ['@portabletext/schema', '2.3.4'],
])

test('fills a bare section with the exact published ranges', () => {
  const annotated = annotateChangelog({
    changelog: [
      '# @portabletext/plugin-dnd',
      '',
      '## 2.0.8',
      '',
      '## 2.0.7',
      '',
      '### Patch Changes',
      '',
      '- An earlier release line.',
      '',
    ].join('\n'),
    version: '2.0.8',
    manifest: {
      name: '@portabletext/plugin-dnd',
      peerDependencies: {
        '@portabletext/editor': 'workspace:^',
        'react': '^19.2',
      },
      devDependencies: {'@portabletext/editor': 'workspace:^'},
    },
    releasedVersions,
  })

  assert.equal(
    annotated,
    [
      '# @portabletext/plugin-dnd',
      '',
      '## 2.0.8',
      '',
      '### Patch Changes',
      '',
      '- fix(deps): require `@portabletext/editor@^8.1.3`',
      '',
      '## 2.0.7',
      '',
      '### Patch Changes',
      '',
      '- An earlier release line.',
      '',
    ].join('\n'),
  )
})

test('lists every released workspace dependency, skipping unreleased and non-workspace ranges', () => {
  const annotated = annotateChangelog({
    changelog: '# pkg\n\n## 1.0.1\n\n## 1.0.0\n\n- Initial release.\n',
    version: '1.0.1',
    manifest: {
      name: 'pkg',
      dependencies: {
        '@portabletext/editor': 'workspace:^',
        '@portabletext/schema': 'workspace:~',
        '@portabletext/unreleased': 'workspace:^',
        'react': '^19.2',
      },
    },
    releasedVersions,
  })

  assert.equal(
    annotated,
    '# pkg\n\n## 1.0.1\n\n### Patch Changes\n\n- fix(deps): require `@portabletext/editor@^8.1.3`, `@portabletext/schema@~2.3.4`\n\n## 1.0.0\n\n- Initial release.\n',
  )
})

test('falls back to a generic line when no released workspace dependency is published', () => {
  const annotated = annotateChangelog({
    changelog: '# pkg\n\n## 1.0.1\n\n## 1.0.0\n\n- Initial release.\n',
    version: '1.0.1',
    manifest: {
      name: 'pkg',
      devDependencies: {'@portabletext/editor': 'workspace:^'},
    },
    releasedVersions,
  })

  assert.equal(
    annotated,
    '# pkg\n\n## 1.0.1\n\n### Patch Changes\n\n- chore: lockstep release, no changes\n\n## 1.0.0\n\n- Initial release.\n',
  )
})

test('annotates a bare section that is the only section in the file', () => {
  const annotated = annotateChangelog({
    changelog: '# pkg\n\n## 1.0.1\n',
    version: '1.0.1',
    manifest: {
      name: 'pkg',
      peerDependencies: {'@portabletext/editor': 'workspace:^'},
    },
    releasedVersions,
  })

  assert.equal(
    annotated,
    '# pkg\n\n## 1.0.1\n\n### Patch Changes\n\n- fix(deps): require `@portabletext/editor@^8.1.3`\n',
  )
})

test('leaves a section with content alone', () => {
  const annotated = annotateChangelog({
    changelog:
      '# pkg\n\n## 1.0.1\n\n### Patch Changes\n\n- fix: a real change.\n',
    version: '1.0.1',
    manifest: {
      name: 'pkg',
      peerDependencies: {'@portabletext/editor': 'workspace:^'},
    },
    releasedVersions,
  })

  assert.equal(annotated, null)
})

test('returns null when the version heading is missing', () => {
  const annotated = annotateChangelog({
    changelog: '# pkg\n\n## 1.0.0\n\n- Initial release.\n',
    version: '1.0.1',
    manifest: {name: 'pkg'},
    releasedVersions,
  })

  assert.equal(annotated, null)
})

test('matches the version heading exactly, not as a prefix', () => {
  const annotated = annotateChangelog({
    changelog: '# pkg\n\n## 1.0.10\n\n- A real change.\n',
    version: '1.0.1',
    manifest: {name: 'pkg'},
    releasedVersions,
  })

  assert.equal(annotated, null)
})

test('a second run over annotated output changes nothing', () => {
  const input = {
    changelog: '# pkg\n\n## 1.0.1\n\n## 1.0.0\n\n- Initial release.\n',
    version: '1.0.1',
    manifest: {
      name: 'pkg',
      peerDependencies: {'@portabletext/editor': 'workspace:^'},
    },
    releasedVersions,
  }
  const annotated = annotateChangelog(input)

  assert.equal(annotateChangelog({...input, changelog: annotated}), null)
})

test('movedPublishedRange mirrors the pnpm workspace protocol substitutions', () => {
  assert.equal(movedPublishedRange('workspace:^', '8.1.3'), '^8.1.3')
  assert.equal(movedPublishedRange('workspace:~', '8.1.3'), '~8.1.3')
  assert.equal(movedPublishedRange('workspace:*', '8.1.3'), '8.1.3')
})

test('an explicit workspace range publishes verbatim, so a release does not move it', () => {
  assert.equal(movedPublishedRange('workspace:^8.0.2', '8.1.3'), null)

  const annotated = annotateChangelog({
    changelog: '# pkg\n\n## 1.0.1\n\n## 1.0.0\n\n- Initial release.\n',
    version: '1.0.1',
    manifest: {
      name: 'pkg',
      peerDependencies: {'@portabletext/editor': 'workspace:^8.0.2'},
    },
    releasedVersions,
  })

  assert.equal(
    annotated,
    '# pkg\n\n## 1.0.1\n\n### Patch Changes\n\n- chore: lockstep release, no changes\n\n## 1.0.0\n\n- Initial release.\n',
  )
})
