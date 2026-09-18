// oxlint-disable no-console
import {spawnSync} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {BENCH_ROOT, REPO_ROOT} from '../bench-root'
import {
  cacheDirForSha,
  isCached,
  readCachedTarballs,
  tarballCacheDir,
  writeCachedTarballsManifest,
} from './cache'
import {buildOverrides} from './overrides'
import {packEditorAt} from './pack-editor'
import {resolveRef} from './resolve-ref'

export interface RefBuild {
  ref: string
  sha: string
  hostDistDir: string
  fromCache: boolean
}

/** See the README's `A/B between refs` section for the two-checkout mechanism (throwaway product worktree -> tarballs -> throwaway host install). */
export function buildEditorAtRef(
  ref: string,
  options: {forceBuild: boolean; log: (message: string) => void},
): RefBuild {
  const sha = resolveRef(ref, REPO_ROOT)
  const tarballsCached = !options.forceBuild && isCached(sha)

  let tarballs: ReadonlyMap<string, string>
  if (tarballsCached) {
    options.log(
      `  ${ref} (${sha.slice(0, 12)}): tarball cache hit, reusing ${tarballCacheDir(sha)}`,
    )
    tarballs = readCachedTarballs(sha)
  } else {
    options.log(`  ${ref} (${sha.slice(0, 12)}): packing tarballs...`)
    fs.rmSync(cacheDirForSha(sha), {recursive: true, force: true})
    const tarballDir = tarballCacheDir(sha)
    const worktreeDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'bench-ab-worktree-'),
    )
    try {
      const built = packEditorAt(sha, worktreeDir, tarballDir)
      writeCachedTarballsManifest(sha, built)
      tarballs = built
    } finally {
      spawnSync('git', ['worktree', 'remove', '--force', worktreeDir], {
        cwd: REPO_ROOT,
      })
      fs.rmSync(worktreeDir, {recursive: true, force: true})
    }
  }

  options.log(`  ${ref} (${sha.slice(0, 12)}): building host...`)
  const hostDistDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bench-ab-host-dist-'),
  )
  buildHostFromTarballs(tarballs, hostDistDir)
  return {ref, sha, hostDistDir, fromCache: tarballsCached}
}

/** Host source comes from the current checkout: historical refs predate the host. */
function buildHostFromTarballs(
  tarballs: ReadonlyMap<string, string>,
  targetDist: string,
): void {
  const editorTarball = tarballs.get('@portabletext/editor')
  if (!editorTarball) {
    throw new Error('packed tarballs did not include @portabletext/editor')
  }

  // `host/src/App.tsx` imports scenario fixtures via `../../scenarios`,
  // which in turn import `../stats/rng` — the host is not a self-contained
  // package, so the stage mirrors perf/bench's own layout: a `package.json`
  // (and, once installed, `node_modules`) at the stage root that `host/`,
  // `scenarios/`, and `stats/` all sit next to and resolve up into, exactly
  // as they do against the real `perf/bench/node_modules` today.
  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-ab-host-'))
  const workDir = path.join(stageDir, 'host')
  try {
    for (const sibling of ['host', 'scenarios', 'stats']) {
      fs.cpSync(path.join(BENCH_ROOT, sibling), path.join(stageDir, sibling), {
        recursive: true,
        // Skip a stray `host/dist` from a previous `bench run`; vite rebuilds it.
        filter: (source) => path.basename(source) !== 'dist',
      })
    }
    fs.writeFileSync(
      path.join(stageDir, 'package.json'),
      JSON.stringify(hostPackageJson(editorTarball), null, 2),
    )
    fs.writeFileSync(
      path.join(stageDir, 'pnpm-workspace.yaml'),
      pnpmWorkspaceYaml(buildOverrides(tarballs)),
    )

    step('pnpm', ['install'], stageDir)
    verifyPackedResolution(stageDir, tarballs)
    step(
      path.join(stageDir, 'node_modules', '.bin', 'vite'),
      ['build'],
      workDir,
    )
    verifyNoWorkspaceLeakage(path.join(workDir, 'dist'))

    fs.rmSync(targetDist, {recursive: true, force: true})
    fs.mkdirSync(path.dirname(targetDist), {recursive: true})
    fs.cpSync(path.join(workDir, 'dist'), targetDist, {recursive: true})
  } finally {
    fs.rmSync(stageDir, {recursive: true, force: true})
  }
}

function hostPackageJson(editorTarball: string): object {
  const versions = readCurrentToolingVersions()
  return {
    name: 'bench-host-ab',
    private: true,
    type: 'module',
    dependencies: {
      '@portabletext/editor': `file:${editorTarball}`,
      'react': versions.react,
      'react-dom': versions.reactDom,
    },
    devDependencies: {
      'vite': versions.vite,
      '@vitejs/plugin-react': versions.pluginReact,
    },
  }
}

/**
 * A one-package `pnpm-workspace.yaml` for the throwaway host build, solely
 * to carry `overrides` — pnpm no longer reads `pnpm.overrides` from
 * `package.json` (it warns and ignores it), only from here. Forces every
 * transitive request for a packed workspace package (e.g.
 * `@portabletext/schema`, pulled in by the editor tarball's own
 * now-real-semver dependency range) to that same tarball. Hand-rolled
 * instead of pulling in a YAML library: every value is a plain `file:`
 * string, so JSON-style double-quoted scalars are valid YAML.
 */
function pnpmWorkspaceYaml(overrides: Record<string, string>): string {
  const lines = ['overrides:']
  for (const [name, spec] of Object.entries(overrides)) {
    lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(spec)}`)
  }
  return `${lines.join('\n')}\n`
}

function readCurrentToolingVersions(): {
  react: string
  reactDom: string
  vite: string
  pluginReact: string
} {
  const read = (packageName: string) =>
    (
      JSON.parse(
        fs.readFileSync(
          path.join(BENCH_ROOT, 'node_modules', packageName, 'package.json'),
          'utf8',
        ),
      ) as {version: string}
    ).version
  return {
    react: read('react'),
    reactDom: read('react-dom'),
    vite: read('vite'),
    pluginReact: read('@vitejs/plugin-react'),
  }
}

/**
 * Tripwire: `pnpm install`'s own `workspace:*`-turned-semver resolution
 * could in principle satisfy a packed dependency — however deep in the
 * graph — from a registry copy that happens to share its version, instead
 * of the tarball. Under pnpm's isolated layout a transitive dependency
 * (e.g. `@portabletext/schema`, pulled in only via the editor tarball's own
 * range) never appears at `node_modules/<name>`, only inside the flat
 * `node_modules/.pnpm` store, so this scans there instead of the top level.
 * Confirms every packed package that store actually pulled into the graph
 * resolved from the tarball (its store entry encodes `<name>@file+...`,
 * scope slash turned `+`), never a registry copy or a leftover workspace
 * link. `@portabletext/editor`'s closure includes dev-only packages
 * (`@portabletext/test`, `racejar`) nothing in the host's dependency graph
 * ever requests — those never appear under `.pnpm` at all, and there's
 * nothing to verify for them.
 */
function verifyPackedResolution(
  stageDir: string,
  tarballs: ReadonlyMap<string, string>,
): void {
  const storeDir = path.join(stageDir, 'node_modules', '.pnpm')
  const storeEntries = fs.existsSync(storeDir) ? fs.readdirSync(storeDir) : []
  for (const name of tarballs.keys()) {
    const marker = `${name.replace('/', '+')}@`
    const registryEntry = storeEntries.find(
      (entry) =>
        entry.startsWith(marker) && !entry.startsWith(`${marker}file+`),
    )
    if (registryEntry) {
      throw new Error(
        `${name} resolved to ${registryEntry} in the pnpm store, not to the packed tarball`,
      )
    }
  }
}

/**
 * Second, independent proof the built dist itself has no path back into
 * this checkout: a host that accidentally resolved `@portabletext/editor`
 * to workspace source (an alias, a stale symlink) would bundle absolute
 * paths into `REPO_ROOT`; a tarball install never can.
 */
function verifyNoWorkspaceLeakage(distDir: string): void {
  const assetsDir = path.join(distDir, 'assets')
  if (!fs.existsSync(assetsDir)) return
  for (const file of fs.readdirSync(assetsDir)) {
    if (!file.endsWith('.js')) continue
    const contents = fs.readFileSync(path.join(assetsDir, file), 'utf8')
    if (contents.includes(REPO_ROOT)) {
      throw new Error(
        `${file} embeds an absolute path into ${REPO_ROOT} — the host resolved ` +
          `@portabletext/editor from workspace source, not the packed tarball`,
      )
    }
  }
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
