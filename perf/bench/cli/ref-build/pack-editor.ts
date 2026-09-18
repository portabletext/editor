// oxlint-disable no-console
import {spawnSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {REPO_ROOT} from '../bench-root'
import {tarballFilename} from './tarball'

const PRODUCT_PACKAGE = '@portabletext/editor'

interface WorkspaceProject {
  name: string
  version: string
  path: string
  private?: boolean
}

/**
 * Checks out `sha` into `worktreeDir` (a throwaway worktree the caller
 * removes), installs it with its own lockfile (`--frozen-lockfile`: a replay
 * of that commit's own install, never a fresh resolution), builds
 * `@portabletext/editor`'s workspace dependency closure, and packs each
 * publishable package into `tarballDir` exactly as `npm publish` would.
 * Returns package name -> tarball path.
 *
 * Shape ported from sanity/perf/bench/cli/commands/buildDistAtCommit.ts's
 * `packProductAt` — keep in sync.
 */
export function packEditorAt(
  sha: string,
  worktreeDir: string,
  tarballDir: string,
): Map<string, string> {
  step('git', ['worktree', 'add', worktreeDir, sha, '--detach'], REPO_ROOT)
  if (!fs.existsSync(path.join(worktreeDir, 'packages', 'editor'))) {
    throw new Error(`commit ${sha.slice(0, 12)} has no packages/editor`)
  }
  step('pnpm', ['install', '--frozen-lockfile'], worktreeDir)

  const filter = `${PRODUCT_PACKAGE}...`
  const publishable = listProjects(worktreeDir, filter).filter(
    (project) => !project.private,
  )
  step('pnpm', ['--filter', filter, 'build'], worktreeDir)

  fs.mkdirSync(tarballDir, {recursive: true})
  const tarballs = new Map<string, string>()
  for (const project of publishable) {
    step('pnpm', ['pack', '--pack-destination', tarballDir], project.path)
    const tarball = path.join(
      tarballDir,
      tarballFilename(project.name, project.version),
    )
    if (!fs.existsSync(tarball)) {
      throw new Error(`pnpm pack of ${project.name} did not produce ${tarball}`)
    }
    tarballs.set(project.name, tarball)
  }
  return tarballs
}

function listProjects(cwd: string, filter: string): WorkspaceProject[] {
  return JSON.parse(
    capture('pnpm', ['ls', '--filter', filter, '--depth', '-1', '--json'], cwd),
  ) as WorkspaceProject[]
}

function capture(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr?.trim()}`,
    )
  }
  return result.stdout
}

function step(command: string, args: string[], cwd: string): void {
  console.log(`$ ${command} ${args.join(' ')}  (in ${cwd})`)
  const result = spawnSync(command, args, {cwd, stdio: 'inherit'})
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status}`,
    )
  }
}
