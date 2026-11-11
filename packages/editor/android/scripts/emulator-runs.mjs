import {spawnSync} from 'node:child_process'
import {
  appendFileSync,
  closeSync,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

// `install-paths.txt` records the paths present before the first install, which cleanup never removes,
// apart from the packages restored from the cache that `cache-restored.txt` lists.
//
// `timing.txt` holds one block of lines per emulator run, the retry's after a `RETRY` line. Each block
// opens with `EMULATOR_START`, written just before its run step. A run prints `BOOTED` once its emulator
// is up. A failed prep adds its `PREP FAILED: <reason>` line, which the job's result quotes, and, when
// Gboard's Japanese dictionary never loaded, a `PREP DICTIONARY_NOT_LOADED` line, which `thumbjar prepare`'s
// exit status decides, never the reason. Once its last stage has ended, it adds one `CHECKED <verdict>`
// line in a single write: `skipped` when no check was needed, or the verdict of the device check after a
// failed stage, `device` or `lost`, which the check writes itself before it does anything else. A booted
// run without that line ended before a check reached a verdict, by its run step's timeout, the check's own,
// or an `adb get-state` that proved nothing, and nothing proves what happened to its device: the action
// shuts the emulator down before any later step could look.

/** The `adb get-state` read after a failed stage. Its process gets the rest of the script's cap to stop. */
const DEVICE_STATE_MILLISECONDS = 5_000

/** @typedef {'never booted' | 'unchecked' | 'lost' | 'dictionary not loaded' | 'reachable'} RunState */

/**
 * What one `adb get-state` proves about the device, or `undefined` when it proves nothing. Only `device` on
 * stdout is reachable. Only an offline device, as `offline` on stdout or adb's `device offline` error, the
 * answer of a dead emulator, or adb finding no such device is lost. Its stderr also carries daemon start-up
 * lines. A device that is `unauthorized`, in `bootloader` or `recovery`, or in any other state is still
 * there, and an adb that never answered may only be slow, so neither is lost: a retry on a reachable device
 * could turn a real test failure into a passing retry.
 *
 * @param {{stdout: string, stderr: string, timedOut: boolean}} adb
 * @returns {'device' | 'lost' | undefined}
 */
export function deviceVerdict(adb) {
  if (adb.timedOut) {
    return undefined
  }
  const state = adb.stdout.trim()
  if (state === 'device') {
    return 'device'
  }
  if (state === 'offline') {
    return 'lost'
  }
  if (
    state === '' &&
    /^error: (device offline|no devices\/emulators found|device '[^']*' not found)$/m.test(
      adb.stderr,
    )
  ) {
    return 'lost'
  }
  return undefined
}

/**
 * Whether to run once more after a failed first run: only when its emulator never booted, adb lost the
 * device after boot, or Gboard's Japanese dictionary never loaded on a device the check found reachable,
 * and never after a retry.
 *
 * @param {string} timing
 * @returns {{retry: false} | {retry: true, line: string}}
 */
export function retryAfter(timing) {
  const runs = splitRuns(timing)
  const [first] = runs
  if (runs.length > 1 || first === undefined) {
    return {retry: false}
  }
  const state = runState(first)
  if (state === 'never booted') {
    return {
      retry: true,
      line: 'BOOT_RETRY: the emulator never booted, retrying once on a fresh emulator',
    }
  }
  if (state === 'lost') {
    return {
      retry: true,
      line: 'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator',
    }
  }
  if (state === 'dictionary not loaded') {
    return {
      retry: true,
      line: "DICTIONARY_RETRY: Gboard's Japanese dictionary never loaded, retrying once on a fresh emulator",
    }
  }
  return {retry: false}
}

/**
 * The job's result from the last run's step `outcome`. A last run whose emulator never booted or lost its
 * device fails as infrastructure, apart from any test result, and so does a retry whose dictionary never
 * loaded. A first run whose dictionary never loaded and that could not retry quotes the prep's reason.
 *
 * @param {string} timing
 * @param {string} outcome
 * @returns {{passed: boolean, line: string}}
 */
export function runResult(timing, outcome) {
  const runs = splitRuns(timing)
  const states = runs.map(runState)
  const last = states.at(-1)
  const prepFailure = /^PREP FAILED: (.*)$/m.exec(runs.at(-1) ?? '')?.[1]
  const first = states.length > 1 ? states[0] : undefined

  const retry =
    first === undefined ? '' : `, on the retry after ${retryReason(first)}`

  if (outcome === 'cancelled') {
    return {passed: false, line: `run outcome: cancelled${retry}`}
  }
  if (outcome !== 'success' && last === 'unchecked') {
    return {
      passed: false,
      line: `run outcome: the run ended after boot without a completed device check${retry}, not a test result`,
    }
  }
  if (
    outcome !== 'success' &&
    (last === 'lost' ||
      last === 'never booted' ||
      (last === 'dictionary not loaded' && first !== undefined))
  ) {
    return {
      passed: false,
      line: `run outcome: ${infrastructureFailure(last, first)}, infrastructure failure, not a test result`,
    }
  }
  return {
    passed: outcome === 'success',
    line: `run outcome: ${outcome}${retry}${prepFailure === undefined ? '' : `, the prep failed: ${prepFailure}`}`,
  }
}

/**
 * Each run's boot, from its `EMULATOR_START` to its `BOOTED`.
 *
 * @param {string} timing
 * @returns {string[]}
 */
export function bootSeconds(timing) {
  return splitRuns(timing).map((run, index) => {
    const start = /^EMULATOR_START at (\d+)$/m.exec(run)?.[1]
    const booted = /^BOOTED at (\d+)$/m.exec(run)?.[1]
    const seconds =
      start === undefined || booted === undefined
        ? 'never booted'
        : `${Number(booted) - Number(start)}`
    return `BOOT_SECONDS run ${index + 1}: ${seconds}`
  })
}

/**
 * What the host sampler and the kernel log say about the emulator process exiting, one line for each exit
 * the sampler saw. An exit within 120 seconds after a `DONE` line in `timing.txt` is the teardown's own kill.
 *
 * @param {string} hostLog
 * @param {string} dmesg
 * @param {string} timing
 * @returns {string[]}
 */
export function hostEvidence(hostLog, dmesg, timing) {
  if (hostLog.trim() === '') {
    return ['host evidence: no host sampler log']
  }
  const exits = [...hostLog.matchAll(/^QEMU_GONE pid=(\d+) at (\d+)$/gm)]
  if (exits.length === 0) {
    return ['host evidence: the host sampler saw no emulator process exit']
  }
  const runs = splitRuns(timing).map((run) => ({
    start: Number(/^EMULATOR_START at (\d+)$/m.exec(run)?.[1] ?? Number.NaN),
    done: [...run.matchAll(/^DONE at (\d+)$/gm)].map((match) =>
      Number(match[1]),
    ),
  }))
  return exits.map(([, pid, epoch]) => {
    const exitedAt = Number(epoch)
    // A run's own DONE is the only one its emulator's exit can follow. Only a log with no start lines counts every
    // DONE, and when start lines exist but none is at or before the exit, no run had started and the exit is mid-run.
    const started = runs.filter((run) => run.start <= exitedAt)
    const candidates = runs.every((run) => Number.isNaN(run.start))
      ? runs
      : started.slice(-1)
    const doneEpochs = candidates.flatMap((run) => run.done)
    const clock = new Date(exitedAt * 1000).toISOString().slice(11, 19)
    const where = doneEpochs.some(
      (done) => exitedAt - done >= 0 && exitedAt - done <= 120,
    )
      ? 'at teardown'
      : 'mid-run'
    let verdict = ''
    if (dmesg.includes(`Out of memory: Killed process ${pid} (qemu-system`)) {
      verdict = ', host OOM'
    } else if (
      new RegExp(
        `qemu-system[^\\n]*\\[${pid}\\][^\\n]*(segfault|trap)|traps: qemu-system[^\\n]*\\[${pid}\\]`,
      ).test(dmesg)
    ) {
      verdict = ', emulator crashed'
    }
    return `host evidence: emulator process ${pid} exited at ${clock} UTC, ${where}${verdict}`
  })
}

/**
 * Paths the install retry clears: those created by the first install attempt, and the packages restored
 * from the cache, which a failed attempt may have left broken or half replaced.
 *
 * @param {string[]} before SDK paths present before the first install attempt
 * @param {string[]} after SDK paths present after the failed attempt
 * @param {string[]} [restored] Packages restored from the cache that its check kept
 * @returns {string[]}
 */
export function installCleanupPaths(before, after, restored = []) {
  return after.filter(
    (path) => !before.includes(path) || restored.includes(path),
  )
}

/**
 * The emulator version and the system image revision a fresh `sdkmanager --install` picks, read from the
 * `Available Packages` table of `sdkmanager --list`, or `undefined` when it lists either not. An installed
 * package is listed above that table with its own version, which is not what a fresh install picks.
 *
 * @param {string} list The output of `sdkmanager --list`
 * @param {string} api The Android API level of the system image
 * @returns {{emulator: string, image: string} | undefined}
 */
export function cacheRevisions(list, api) {
  const available = list.split(/^Available Packages:$/m)[1] ?? ''
  const version = (/** @type {string} */ name) =>
    available
      .split('\n')
      .map((line) => line.split('|').map((cell) => cell.trim()))
      .find((cells) => cells[0] === name)?.[1]
  const emulator = version('emulator')
  const image = version(
    `system-images;android-${api};google_apis_playstore;x86_64`,
  )
  return emulator === undefined ||
    emulator === '' ||
    image === undefined ||
    image === ''
    ? undefined
    : {emulator, image}
}

/**
 * Why a restored package does not match its manifest entry, or `undefined` when it has exactly its files
 * with their sizes.
 *
 * @param {Map<string, number> | undefined} manifest The package's files and sizes when it was saved
 * @param {Map<string, number>} files The package's files and sizes after the restore
 * @returns {string | undefined}
 */
export function packageMismatch(manifest, files) {
  if (manifest === undefined) {
    return 'the manifest has no entry for it'
  }
  const differences = [
    ...[...manifest].map(([path, size]) =>
      !files.has(path)
        ? `\`${path}\` is missing`
        : files.get(path) === size
          ? undefined
          : `\`${path}\` has ${files.get(path)} bytes, the manifest ${size}`,
    ),
    ...[...files.keys()]
      .filter((path) => !manifest.has(path))
      .map((path) => `\`${path}\` is not in the manifest`),
  ].filter((difference) => difference !== undefined)
  if (differences.length === 0) {
    return undefined
  }
  return differences.length === 1
    ? differences[0]
    : `${differences[0]}, and ${differences.length - 1} more differences`
}

/**
 * The job's result from the job status, two install steps and last emulator run. The run line is
 * `runResult`'s, and an install retry gets its own line before it.
 *
 * @param {string} timing The emulator runs' `timing.txt` contents, empty when no run started
 * @param {string} outcome The last emulator run step's outcome, `skipped` when no run started
 * @param {string | undefined} first The first install step's outcome
 * @param {string | undefined} second The install retry step's outcome
 * @param {string | undefined} [jobStatus] The job's status when Result starts
 * @returns {{passed: boolean, line: string, installLine?: string}}
 */
export function installResult(
  timing,
  outcome,
  first,
  second,
  jobStatus = undefined,
) {
  if (jobStatus === 'cancelled' && !/^EMULATOR_START /m.test(timing)) {
    return {passed: false, line: 'run outcome: cancelled'}
  }
  if (first === 'failure' && second === 'failure') {
    return {
      passed: false,
      line: 'run outcome: the emulator install failed twice, infrastructure failure, not a test result',
    }
  }
  if (first !== 'success' && second !== 'success') {
    if (first === 'cancelled' || second === 'cancelled') {
      return {passed: false, line: 'run outcome: cancelled'}
    }
    if (first === 'skipped' && second === 'skipped') {
      return {
        passed: false,
        line: 'run outcome: no emulator run, a step before the emulator install failed',
      }
    }
  }
  const result = runResult(timing, outcome)
  return first === 'failure' && second === 'success'
    ? {
        ...result,
        installLine: 'install outcome: retried once after a failed install',
      }
    : result
}

/**
 * The last lines of a `sdkmanager --install` log, for a job log that would otherwise say nothing about the
 * package a failed or timed-out install was working on. A progress bar redraws its line with carriage
 * returns, so each line keeps only its last state. Only the last characters of the string are used and a
 * long line is cut, so the output stays small however much `sdkmanager` printed. The caller reads just the
 * end of the file.
 *
 * @param {string | undefined} log The install attempt's log, `undefined` when no file exists
 * @param {number} [maxLines]
 * @returns {string[]}
 */
export function installLogTail(log, maxLines = INSTALL_LOG_TAIL_LINES) {
  const lines = (log ?? '')
    .slice(-INSTALL_LOG_READ_CHARACTERS)
    .split('\n')
    .map((line) => {
      const redraws = line.split('\r').filter((state) => state.trim() !== '')
      return (redraws.at(-1) ?? '').trimEnd()
    })
    .filter((line) => line !== '')
    .map((line) =>
      line.length > INSTALL_LOG_LINE_CHARACTERS
        ? `${line.slice(0, INSTALL_LOG_LINE_CHARACTERS)}...`
        : line,
    )
  return lines.slice(-maxLines)
}

/**
 * The lines the Result step prints for each install attempt that failed, with the tail of its log. A log
 * that cannot be read gets a line naming the error code, so it never costs the other attempt's lines.
 *
 * @param {string | undefined} first The first install step's outcome
 * @param {string | undefined} second The install retry step's outcome
 * @param {(attempt: 1 | 2) => string | undefined} readLog The attempt's log, `undefined` when it has none.
 *   It throws when the log exists but cannot be read
 * @returns {string[]}
 */
export function installFailureLines(first, second, readLog) {
  /** @type {string[]} */
  const lines = []
  for (const [attempt, attemptOutcome] of /** @type {const} */ ([
    [1, first],
    [2, second],
  ])) {
    if (attemptOutcome !== 'failure') {
      continue
    }
    const logFile = `android/out/sdk-install-${attempt}.log`
    /** @type {string | undefined} */
    let log
    try {
      log = readLog(attempt)
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error ? String(error.code) : 'error'
      lines.push(
        `install attempt ${attempt}: ${logFile} could not be read (${code})`,
      )
      continue
    }
    const tail = installLogTail(log)
    lines.push(
      tail.length === 0
        ? `install attempt ${attempt}: no install output was recorded in android/out/sdk-install-${attempt}.log`
        : `install attempt ${attempt}: last ${tail.length} lines of android/out/sdk-install-${attempt}.log`,
      ...tail.map((line) => `  ${line}`),
    )
  }
  return lines
}

const INSTALL_LOG_TAIL_LINES = 30
const INSTALL_LOG_READ_CHARACTERS = 65_536
// A tail of this many bytes decodes to at most this many characters, so installLogTail never cuts a file's tail further
const INSTALL_LOG_READ_BYTES = INSTALL_LOG_READ_CHARACTERS
const INSTALL_LOG_LINE_CHARACTERS = 300

const [command, file, outcome, manifestFile, key] = process.argv.slice(2)

if (!isMain()) {
  // Imported by its unit test.
} else if (
  command === 'install-start' &&
  file !== undefined &&
  outcome !== undefined
) {
  mkdirSync('android/out', {recursive: true})
  writeFileSync(
    'android/out/install-paths.txt',
    installPaths(file, outcome).join('\n'),
  )
} else if (
  command === 'install-retry' &&
  file !== undefined &&
  outcome !== undefined
) {
  mkdirSync('android/out', {recursive: true})
  if (existsSync('android/out/install-paths.txt')) {
    const before = readFileSync('android/out/install-paths.txt', 'utf8').split(
      '\n',
    )
    const restored = existsSync('android/out/cache-restored.txt')
      ? readFileSync('android/out/cache-restored.txt', 'utf8').split('\n')
      : []
    for (const path of installCleanupPaths(
      before,
      installPaths(file, outcome),
      restored,
    )) {
      rmSync(join(file, path), {recursive: true, force: true})
    }
    report(
      'INSTALL_RETRY: the emulator install failed, retrying once after clearing its downloads and incomplete packages',
    )
  } else {
    report(
      'INSTALL_RETRY: no install snapshot existed, retrying once without clearing paths',
    )
  }
} else if (
  command === 'cache-revisions' &&
  file !== undefined &&
  outcome !== undefined &&
  manifestFile !== undefined
) {
  const revisions = cacheRevisions(readFileSync(0, 'utf8'), outcome)
  const present = cachedPackages(outcome).filter((path) =>
    existsSync(join(file, path)),
  )
  if (revisions === undefined) {
    log(
      `CACHE_REVISIONS: \`sdkmanager --list\` did not list ${cachedPackageNames(
        outcome,
      )
        .map((name) => `\`${name}\``)
        .join(' and ')}, skipping the cache`,
    )
  } else if (present.length > 0) {
    // The runner image now ships a package the cache holds, and a restore would overwrite it.
    log(
      `CACHE_REVISIONS: the SDK already has ${present
        .map((path) => `\`${path}\``)
        .join(' and ')}, skipping the cache`,
    )
  } else {
    appendFileSync(
      process.env.GITHUB_OUTPUT ?? '/dev/null',
      [
        `emulator=${revisions.emulator}`,
        `image=${revisions.image}`,
        `key=android-sdk-${process.env.RUNNER_OS}-api${outcome}-google_apis_playstore-x86_64-image${revisions.image}-emulator${revisions.emulator}`,
        'paths<<PATHS',
        ...cachedPackages(outcome).map((path) => join(file, path)),
        manifestFile,
        'PATHS',
        '',
      ].join('\n'),
    )
  }
} else if (
  command === 'cache-manifest' &&
  file !== undefined &&
  outcome !== undefined &&
  manifestFile !== undefined &&
  key !== undefined
) {
  const missing = cachedPackages(outcome).find(
    (path) => !existsSync(join(file, path)),
  )
  const lines = (missing === undefined ? cachedPackages(outcome) : []).flatMap(
    (path) =>
      [...packageFiles(join(file, path))].map(([entry, size]) => ({
        path: `${path}/${entry}`,
        line: `${path}\t${entry}\t${size}\n`,
      })),
  )
  // A tab or a line break in a name would split its manifest line, and the next check would delete both
  // packages on every hit.
  const unsupported = lines.find(({path}) => /[\t\n\r]/.test(path))
  if (missing !== undefined) {
    console.error(
      `CACHE_MANIFEST: \`${missing}\` is not installed, not saving the cache`,
    )
    process.exitCode = 1
  } else if (unsupported !== undefined) {
    console.error(
      `CACHE_MANIFEST: \`${unsupported.path.replace(/[\t\n\r]/g, (character) => ({'\t': '\\t', '\n': '\\n', '\r': '\\r'})[character] ?? character)}\` has a tab, a newline or a carriage return in its name, not saving the cache`,
    )
    process.exitCode = 1
  } else {
    writeFileSync(
      manifestFile,
      `${key}\n${lines.map(({line}) => line).join('')}`,
    )
  }
} else if (
  command === 'cache-check' &&
  file !== undefined &&
  outcome !== undefined &&
  manifestFile !== undefined &&
  key !== undefined
) {
  const restored = cachedPackages(outcome).filter((path) =>
    existsSync(join(file, path)),
  )
  if (restored.length > 0) {
    const manifest = readManifest(manifestFile)
    const kept = []
    for (const path of restored) {
      const files = packageFiles(join(file, path))
      // A manifest saved for another key describes other packages, whatever their files match.
      const mismatch =
        manifest !== undefined && manifest.key !== key
          ? "the manifest does not name this cache's key"
          : packageMismatch(manifest?.packages.get(path), files)
      if (mismatch === undefined) {
        kept.push(path)
        log(
          `CACHE_CHECK: kept \`${path}\`, its ${files.size} files match the manifest`,
        )
      } else {
        rmSync(join(file, path), {recursive: true, force: true})
        log(
          `CACHE_CHECK: deleted \`${path}\`, ${mismatch}, so the install downloads it`,
        )
      }
    }
    if (kept.length > 0) {
      mkdirSync('android/out', {recursive: true})
      writeFileSync('android/out/cache-restored.txt', kept.join('\n'))
    }
  }
} else if (command === 'device-state' && file !== undefined) {
  const adb = spawnSync('adb', ['get-state'], {
    encoding: 'utf8',
    timeout: DEVICE_STATE_MILLISECONDS,
    killSignal: 'SIGKILL',
  })
  const verdict = deviceVerdict({
    stdout: adb.stdout ?? '',
    stderr: adb.stderr ?? '',
    timedOut: adb.error !== undefined,
  })
  if (verdict === undefined) {
    process.exitCode = 1
  } else {
    appendFileSync(
      file,
      `CHECKED ${verdict} at ${Math.floor(Date.now() / 1000)}\n`,
    )
    process.stdout.write(`${verdict}\n`)
  }
} else if (command === 'retry' && file !== undefined) {
  const decision = retryAfter(readFileSync(file, 'utf8'))
  appendFileSync(
    process.env.GITHUB_OUTPUT ?? '/dev/null',
    `retry=${decision.retry ? 'yes' : 'no'}\n`,
  )
  if (decision.retry) {
    report(decision.line)
    appendFileSync(
      file,
      `RETRY\nEMULATOR_START at ${Math.floor(Date.now() / 1000)}\n`,
    )
  }
} else if (command === 'boot-seconds' && file !== undefined) {
  process.stdout.write(
    existsSync(file)
      ? `${bootSeconds(readFileSync(file, 'utf8')).join('\n')}\n`
      : '',
  )
} else if (
  command === 'result' &&
  file !== undefined &&
  outcome !== undefined
) {
  const result = installResult(
    existsSync(file) ? readFileSync(file, 'utf8') : '',
    outcome,
    process.env.INSTALL1_OUTCOME,
    process.env.INSTALL2_OUTCOME,
    process.env.JOB_STATUS,
  )
  for (const line of installFailureLines(
    process.env.INSTALL1_OUTCOME,
    process.env.INSTALL2_OUTCOME,
    (attempt) => readTail(`android/out/sdk-install-${attempt}.log`),
  )) {
    log(line)
  }
  if (result.installLine !== undefined) {
    report(result.installLine)
  }
  report(result.line)
  process.exitCode = result.passed ? 0 : 1
} else if (command === 'host-evidence' && file !== undefined) {
  try {
    for (const line of hostEvidence(
      readOrEmpty(join(file, 'host.log')),
      readOrEmpty(join(file, 'host-dmesg.txt')),
      readOrEmpty(join(file, 'timing.txt')),
    )) {
      report(line)
    }
  } catch {
    // Evidence never fails the job.
  }
} else {
  console.error(
    'usage: node android/scripts/emulator-runs.mjs device-state|retry|boot-seconds <timing.txt> | result <timing.txt> <outcome>',
  )
  process.exitCode = 2
}

/**
 * The install's possible download and package paths, relative to the SDK root. Comparing these with the
 * first attempt's snapshot limits cleanup to paths absent before that attempt.
 *
 * @param {string} sdk The Android SDK root
 * @param {string} api The Android API level of the requested platform and system image
 * @returns {string[]}
 */
function installPaths(sdk, api) {
  const packages = [
    'platform-tools',
    'emulator',
    `platforms/android-${api}`,
    `system-images/android-${api}/google_apis_playstore/x86_64`,
  ]
  const temporary = '.temp'
  const downloads = existsSync(join(sdk, temporary))
    ? readdirSync(join(sdk, temporary))
        .filter((name) => /^PackageOperation\d+$/.test(name))
        .map((name) => `${temporary}/${name}`)
    : []
  return [
    ...downloads,
    ...packages.filter((path) => existsSync(join(sdk, path))),
  ]
}

/**
 * The packages the cache holds, relative to the SDK root. The runner image ships platform-tools and the
 * platform, and the cache would only pin older copies of them.
 *
 * @param {string} api The Android API level of the system image
 * @returns {string[]}
 */
function cachedPackages(api) {
  return [
    'emulator',
    `system-images/android-${api}/google_apis_playstore/x86_64`,
  ]
}

/**
 * The `sdkmanager` names of `cachedPackages`.
 *
 * @param {string} api The Android API level of the system image
 * @returns {string[]}
 */
function cachedPackageNames(api) {
  return [
    'emulator',
    `system-images;android-${api};google_apis_playstore;x86_64`,
  ]
}

/**
 * Every entry under a package with its size, relative to the package. A symlink counts as a file of its
 * own size, so a restore that turns it into its target or drops it is a mismatch.
 *
 * @param {string} directory
 * @returns {Map<string, number>}
 */
function packageFiles(directory) {
  /** @type {Map<string, number>} */
  const files = new Map()
  for (const entry of readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) {
      const path = join(entry.parentPath, entry.name)
      files.set(path.slice(directory.length + 1), lstatSync(path).size)
    }
  }
  return files
}

/**
 * The manifest saved with the cache, the cache's key on its first line and then one
 * `<package>\t<path>\t<size>` line per file, or `undefined` when it is missing or has a line of another
 * shape.
 *
 * @param {string} manifestFile
 * @returns {{key: string, packages: Map<string, Map<string, number>>} | undefined}
 */
function readManifest(manifestFile) {
  if (!existsSync(manifestFile)) {
    return undefined
  }
  const [key = '', ...lines] = readFileSync(manifestFile, 'utf8').split('\n')
  /** @type {Map<string, Map<string, number>>} */
  const packages = new Map()
  for (const line of lines) {
    if (line === '') {
      continue
    }
    const [path, entry, size, ...rest] = line.split('\t')
    if (
      !path ||
      !entry ||
      size === undefined ||
      rest.length > 0 ||
      !/^\d+$/.test(size)
    ) {
      return undefined
    }
    packages.set(
      path,
      new Map([...(packages.get(path) ?? []), [entry, Number(size)]]),
    )
  }
  return {key, packages}
}

/**
 * @param {string} timing
 * @returns {string[]}
 */
function splitRuns(timing) {
  return timing.split(/^RETRY$/m)
}

/**
 * @param {string} run
 * @returns {RunState}
 */
function runState(run) {
  if (!/^BOOTED /m.test(run)) {
    return 'never booted'
  }
  const verdict = /^CHECKED (\w+) at \d+$/m.exec(run)?.[1]
  if (verdict === undefined) {
    return 'unchecked'
  }
  if (verdict === 'lost') {
    return 'lost'
  }
  return verdict === 'device' && /^PREP DICTIONARY_NOT_LOADED$/m.test(run)
    ? 'dictionary not loaded'
    : 'reachable'
}

/**
 * @param {RunState} state
 * @returns {string}
 */
function retryReason(state) {
  if (state === 'never booted') {
    return 'the emulator never booted'
  }
  return state === 'dictionary not loaded'
    ? "Gboard's Japanese dictionary never loaded"
    : 'adb lost the device'
}

/**
 * @param {'lost' | 'never booted' | 'dictionary not loaded'} last
 * @param {RunState | undefined} first
 * @returns {string}
 */
function infrastructureFailure(last, first) {
  const failure =
    last === 'lost'
      ? 'device lost'
      : last === 'never booted'
        ? 'the emulator never booted'
        : "Gboard's Japanese dictionary never loaded"
  if (first === undefined) {
    return failure
  }
  return first === last
    ? `${failure} twice`
    : `${failure} on the retry after ${retryReason(first)}`
}

/**
 * Writes a cache line to the log only, so the job summary reads as it does without the cache.
 *
 * @param {string} line
 */
function log(line) {
  process.stdout.write(`${line}\n`)
}

/**
 * The last `INSTALL_LOG_READ_BYTES` bytes of a file as UTF-8, without reading the rest. A sequence cut at
 * the start decodes to a replacement character.
 *
 * @param {string} path
 * @returns {string | undefined} `undefined` when the file does not exist
 */
function readTail(path) {
  if (!existsSync(path)) {
    return undefined
  }
  const descriptor = openSync(path, 'r')
  try {
    const size = fstatSync(descriptor).size
    const buffer = Buffer.alloc(Math.min(size, INSTALL_LOG_READ_BYTES))
    const start = size - buffer.length
    let read = 0
    while (read < buffer.length) {
      const count = readSync(
        descriptor,
        buffer,
        read,
        buffer.length - read,
        start + read,
      )
      if (count === 0) {
        break
      }
      read += count
    }
    return buffer.toString('utf8', 0, read)
  } finally {
    closeSync(descriptor)
  }
}

/**
 * @param {string} path
 * @returns {string}
 */
function readOrEmpty(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

/** @param {string} line */
function report(line) {
  process.stdout.write(`${line}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`)
  }
}

/**
 * Whether `node` runs this file. Where Node sets `import.meta.main` to a boolean, from 22.18 and 24.2, that
 * is the answer. On a Node without it the entry path `process.argv[1]` decides: no entry path is not
 * this file, and an entry path equal to this file's path is, without reading the filesystem, so a file
 * removed after Node loaded it still runs. Otherwise the entry path is resolved, since a script run through
 * a symlinked directory has its real path as `import.meta.url`, and an entry path that does not resolve,
 * such as `-` for a module read from stdin, is not this file.
 *
 * @returns {boolean}
 */
function isMain() {
  /** @type {{main?: unknown}} */
  const meta = import.meta
  if (typeof meta.main === 'boolean') {
    return meta.main
  }
  const entry = process.argv[1]
  if (entry === undefined) {
    return false
  }
  const file = fileURLToPath(import.meta.url)
  if (entry === file) {
    return true
  }
  try {
    return realpathSync(entry) === file
  } catch {
    return false
  }
}
