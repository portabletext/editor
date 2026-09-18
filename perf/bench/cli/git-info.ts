import {execFileSync} from 'node:child_process'
import type {GitInfo} from './types'

/**
 * Git facts for a `benchRun`. Defaults to HEAD (`run`/`self-test`); `ab`
 * passes the resolved `--to` sha so `git.sha`/`git.committedAt` describe the
 * experiment side while `git.branch` stays the invoking checkout's branch.
 */
export function readGitInfo(
  sha: string = runGit(['rev-parse', 'HEAD']),
): GitInfo {
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  return {
    sha,
    branch,
    mergeBaseSha: readMergeBaseSha(sha),
    committedAt: readCommittedAt(sha),
  }
}

export function readCommittedAt(sha: string): string {
  return runGit(['show', '-s', '--format=%cI', sha])
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
