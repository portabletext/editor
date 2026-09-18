import {execFileSync} from 'node:child_process'
import type {GitInfo} from './types'

export function readGitInfo(): GitInfo {
  const sha = runGit(['rev-parse', 'HEAD'])
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  const committedAt = runGit(['show', '-s', '--format=%cI', 'HEAD'])
  return {sha, branch, mergeBaseSha: readMergeBaseSha(sha), committedAt}
}

function readMergeBaseSha(sha: string): string | undefined {
  try {
    const mergeBase = runGit(['merge-base', sha, 'origin/main'])
    return mergeBase === sha ? undefined : mergeBase
  } catch {
    return undefined
  }
}

function runGit(args: string[]): string {
  return execFileSync('git', args, {encoding: 'utf8'}).trim()
}

export function computeRunId(
  mode: 'absolute' | 'ab',
  branch: string,
  sha: string,
): string {
  const safeBranch = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `benchrun-${mode}-${safeBranch}-${sha.slice(0, 12)}`
}
