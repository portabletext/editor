/**
 * Runs right after `changeset version` (see the `changeset:version` script).
 *
 * `updateInternalDependents: "always"` releases every workspace dependent
 * whenever a package it depends on releases. When that is the only reason
 * for the release, changesets writes a bare version heading with no body:
 * it derives changelog dependency lines from source-tree range rewrites,
 * and a `workspace:` range is never rewritten in the source tree. The
 * published artifact does change (pnpm substitutes `workspace:` ranges
 * with the co-released versions at publish time), so this script fills
 * each bare section with the exact ranges the release will publish.
 *
 * Lockstep bumps are always patches here (`updateInternalDependencies:
 * "patch"`, and `workspace:^` ranges are never out of range), so the
 * inserted heading is hardcoded to `### Patch Changes`. Revisit if the
 * repo ever adopts changesets pre-release mode.
 *
 * The pure logic is exported and pinned by
 * `annotate-lockstep-releases.test.mjs`; only `main` touches git and the
 * file system.
 */
import {execSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

/**
 * The range pnpm publishes for a `workspace:` range once the dependency
 * is released at `releasedVersion`, or `null` when the release does not
 * move the published range: an explicit range like `workspace:^8.0.2`
 * publishes as `^8.0.2` verbatim, release after release.
 */
export function movedPublishedRange(range, releasedVersion) {
  const protocolSuffix = range.slice('workspace:'.length)
  if (protocolSuffix === '^' || protocolSuffix === '~') {
    return `${protocolSuffix}${releasedVersion}`
  }
  if (protocolSuffix === '*') {
    return releasedVersion
  }
  return null
}

/**
 * Returns the changelog with the bare `## <version>` section filled in,
 * or `null` when there is nothing to do (heading missing, or the section
 * already has content).
 */
export function annotateChangelog({
  changelog,
  version,
  manifest,
  releasedVersions,
}) {
  const heading = `## ${version}`
  const headingStart = changelog.indexOf(`${heading}\n`)
  if (headingStart === -1) {
    return null
  }
  const bodyStart = headingStart + heading.length
  const bodyEnd = changelog.indexOf('\n## ', bodyStart)
  const body = changelog.slice(bodyStart, bodyEnd === -1 ? undefined : bodyEnd)
  if (body.trim() !== '') {
    return null
  }

  const publishedRanges = []
  for (const dependencyField of [
    'dependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const [dependencyName, range] of Object.entries(
      manifest[dependencyField] ?? {},
    )) {
      const releasedVersion = releasedVersions.get(dependencyName)
      if (releasedVersion === undefined || !range.startsWith('workspace:')) {
        continue
      }
      const published = movedPublishedRange(range, releasedVersion)
      if (published === null) {
        continue
      }
      publishedRanges.push(`\`${dependencyName}@${published}\``)
    }
  }

  const explanation =
    publishedRanges.length > 0
      ? `- fix(deps): require ${publishedRanges.join(', ')}`
      : '- chore: lockstep release, no changes'

  return `${changelog.slice(0, bodyStart)}\n\n### Patch Changes\n\n${explanation}${changelog.slice(bodyStart)}`
}

function main() {
  const changedManifestPaths = execSync('git diff HEAD --name-only', {
    encoding: 'utf8',
  })
    .split('\n')
    // Encodes the workspace layout: every publishable package lives
    // directly under `packages/`. A new workspace directory needs a
    // matching pattern here or its releases go unannotated.
    .filter((line) => /^packages\/[^/]+\/package\.json$/.test(line))

  const manifests = changedManifestPaths.map((manifestPath) => ({
    manifestPath,
    manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
  }))
  const releasedVersions = new Map(
    manifests.map(({manifest}) => [manifest.name, manifest.version]),
  )

  for (const {manifestPath, manifest} of manifests) {
    const changelogPath = path.join(path.dirname(manifestPath), 'CHANGELOG.md')
    if (!fs.existsSync(changelogPath)) {
      continue
    }
    const annotated = annotateChangelog({
      changelog: fs.readFileSync(changelogPath, 'utf8'),
      version: manifest.version,
      manifest,
      releasedVersions,
    })
    if (annotated !== null) {
      fs.writeFileSync(changelogPath, annotated)
      console.log(`annotated ${manifest.name}@${manifest.version}`)
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
