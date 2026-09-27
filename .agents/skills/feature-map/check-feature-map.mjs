import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const PATH_PREFIXES = ['packages/', 'apps/', '.agents/', '.github/', './']

export function checkFeatureMap({markdown, repoRoot}) {
  const paths = new Set()

  for (const match of markdown.matchAll(/`([^`\s]+)`/g)) {
    const token = match[1]

    if (PATH_PREFIXES.some((prefix) => token.startsWith(prefix))) {
      paths.add(token)
    }
  }

  const globs = [...paths].filter((candidate) => /[*?[\]{}]/.test(candidate))
  const missing = [...paths].filter(
    (candidate) =>
      !globs.includes(candidate) &&
      !fs.existsSync(path.join(repoRoot, candidate)),
  )

  return {paths: [...paths], globs, missing}
}

export function runCheck({markdown, repoRoot, label, log, error}) {
  const {paths, globs, missing} = checkFeatureMap({markdown, repoRoot})

  if (paths.length === 0) {
    error(
      `No repo-relative paths found in ${label}. The extraction is broken or the map is empty.`,
    )
    return 1
  }

  if (globs.length > 0 || missing.length > 0) {
    for (const glob of globs) {
      error(`Glob, not a path: ${glob}`)
    }
    for (const missingPath of missing) {
      error(`Missing: ${missingPath}`)
    }
    error(
      `\n${globs.length + missing.length} of ${paths.length} paths in ${label} need fixing.`,
    )
    return 1
  }

  log(`All ${paths.length} paths in ${label} exist.`)
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skillDirectory = path.dirname(fileURLToPath(import.meta.url))
  const repoRoot = path.resolve(skillDirectory, '../../..')
  const skillPath = path.join(skillDirectory, 'SKILL.md')

  process.exitCode = runCheck({
    markdown: fs.readFileSync(skillPath, 'utf8'),
    repoRoot,
    label: path.relative(repoRoot, skillPath),
    log: console.log,
    error: console.error,
  })
}
