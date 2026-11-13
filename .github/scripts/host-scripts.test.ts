import {spawn, spawnSync} from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

const sampler = fileURLToPath(new URL('host-sampler.sh', import.meta.url))
const capture = fileURLToPath(new URL('host-capture.sh', import.meta.url))

// The scripts run on the Linux CI runners and read /proc, which macOS and Windows don't have.
const describeOnLinux = describe.runIf(process.platform === 'linux')

let sudoDirectory: string
let originalPath: string | undefined
beforeEach(() => {
  sudoDirectory = mkdtempSync(join(tmpdir(), 'host-sudo-'))
  writeFileSync(join(sudoDirectory, 'sudo'), '#!/bin/sh\nexit 1\n', {
    mode: 0o755,
  })
  originalPath = process.env.PATH
  process.env.PATH = `${sudoDirectory}:${originalPath}`
})
afterEach(() => {
  process.env.PATH = originalPath
  rmSync(sudoDirectory, {recursive: true, force: true})
})

describeOnLinux('host-sampler.sh and host-capture.sh', () => {
  test('Scenario: An outer timeout kills the debugger group and deletes every core', async () => {
    const fixture = startCoreCapture(true)
    try {
      await vi.waitFor(() =>
        expect(existsSync(join(fixture.directory, 'gdb.pid'))).toEqual(true),
      )
      const debuggerPid = Number(
        readFileSync(join(fixture.directory, 'gdb.pid'), 'utf8'),
      )
      await vi.waitFor(
        () => expect(fixture.captureProcess.exitCode).toEqual(124),
        {timeout: 10_000},
      )
      expect({
        cores: existsSync(fixture.coreDirectory)
          ? readdirSync(fixture.coreDirectory)
          : [],
        debuggerAlive: isAlive(debuggerPid),
        restored: readFileSync(join(fixture.directory, 'restored'), 'utf8'),
      }).toEqual({cores: [], debuggerAlive: false, restored: 'foo\n'})
      expect(
        readFileSync(
          join(fixture.directory, 'host-core-pattern-after.txt'),
          'utf8',
        ),
      ).toEqual('foo\n')
    } finally {
      fixture.cleanup()
    }
  }, 15_000)

  test('Scenario: TERM restores the pattern before a blocked debugger finishes', async () => {
    const fixture = startCoreCapture(false)
    try {
      await vi.waitFor(() =>
        expect(existsSync(join(fixture.directory, 'gdb.pid'))).toEqual(true),
      )
      fixture.captureProcess.kill('SIGTERM')
      await vi.waitFor(
        () => {
          expect(
            readFileSync(join(fixture.directory, 'restored'), 'utf8'),
          ).toEqual('foo\n')
          expect(
            readFileSync(join(fixture.directory, 'cores-at-restore'), 'utf8'),
          ).toEqual('')
        },
        {timeout: 3_000},
      )
    } finally {
      fixture.cleanup()
    }
  }, 10_000)

  test('Scenario: The sampler records the emulator executable and core limits', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-core-sampler-'))
    const fakeEmulator = spawn('sleep', ['143'], {stdio: 'ignore'})
    writeFileSync(join(directory, 'host-core-dir.txt'), directory)
    writeFileSync(
      join(directory, 'sudo'),
      '#!/bin/bash\nprintf "%s\\n" "$*" > "$HOST_TEST_SUDO"\n',
      {mode: 0o755},
    )
    const samplerProcess = spawn(
      'bash',
      [sampler, join(directory, 'host.log')],
      {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          HOST_TEST_SUDO: join(directory, 'sudo-arguments'),
          HOST_SAMPLER_PATTERN: '^sleep 143$',
          HOST_SAMPLER_INTERVAL: '0.2',
        },
        stdio: 'ignore',
      },
    )
    try {
      await vi.waitFor(
        () => {
          expect(
            readFileSync(
              join(directory, `host-exe-${fakeEmulator.pid}.txt`),
              'utf8',
            ),
          ).toEqual(
            spawnSync('readlink', [`/proc/${fakeEmulator.pid}/exe`], {
              encoding: 'utf8',
            }).stdout,
          )
          expect(
            readFileSync(
              join(directory, `host-core-limits-${fakeEmulator.pid}.txt`),
              'utf8',
            ),
          ).toEqual(
            readFileSync(`/proc/${fakeEmulator.pid}/limits`, 'utf8') +
              'coredump_filter=' +
              readFileSync(`/proc/${fakeEmulator.pid}/coredump_filter`, 'utf8'),
          )
          expect(
            readFileSync(join(directory, 'sudo-arguments'), 'utf8'),
          ).toEqual(
            `-n prlimit --pid ${fakeEmulator.pid} --core=unlimited:unlimited\n`,
          )
        },
        {timeout: 5_000},
      )
    } finally {
      fakeEmulator.kill('SIGKILL')
      samplerProcess.kill('SIGKILL')
      rmSync(directory, {recursive: true, force: true})
    }
  }, 10_000)

  test('Scenario: Core preparation chooses the disk with more room and preserves the original pattern', () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-core-setup-'))
    const coreDirectory = join(directory, 'cores')
    const output = join(directory, 'out')
    mkdirSync(join(directory, 'emulator'))
    writeFileSync(
      join(directory, 'emulator', 'source.properties'),
      'Pkg.Revision = 37.2.13\n',
    )
    writeFileSync(
      join(directory, 'emulator', 'emulator'),
      '#!/bin/sh\nexit 42\n',
      {mode: 0o755},
    )
    writeFileSync(
      join(directory, 'cat'),
      '#!/bin/bash\nif [ "$1" = /proc/sys/kernel/core_pattern ]; then printf "%s\\n" "|/usr/lib/systemd/systemd-coredump %P %s"; else /bin/cat "$@"; fi\n',
      {mode: 0o755},
    )
    writeFileSync(
      join(directory, 'df'),
      '#!/bin/bash\necho "Filesystem 1024-blocks Used Available Capacity Mounted"\nif [ "$2" = /mnt ]; then echo "disk 1000 100 900 10% /mnt"; else echo "disk 1000 500 500 50% /"; fi\n',
      {mode: 0o755},
    )
    writeFileSync(join(directory, 'gdb'), '#!/bin/bash\nexit 0\n', {
      mode: 0o755,
    })
    writeFileSync(
      join(directory, 'sudo'),
      `#!/bin/bash
[ "$1" = -n ] || exit 1
shift
case "$1" in
  mktemp) printf '%s\\n' "$3" > "$HOST_TEST_SELECTED"; mkdir "$HOST_TEST_CORE"; echo "$HOST_TEST_CORE" ;;
  chown) exit 0 ;;
  tee) cat > "$HOST_TEST_PATTERN" ;;
  *) exit 1 ;;
esac
`,
      {mode: 0o755},
    )
    try {
      const result = spawnSync(
        'bash',
        [
          fileURLToPath(new URL('host-core.sh', import.meta.url)),
          'prepare',
          output,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            ANDROID_HOME: directory,
            HOST_TEST_CORE: coreDirectory,
            HOST_TEST_SELECTED: join(directory, 'selected'),
            HOST_TEST_PATTERN: join(directory, 'pattern'),
          },
        },
      )
      expect(result.status).toEqual(0)
      expect({
        version: readFileSync(
          join(output, 'host-emulator-version.txt'),
          'utf8',
        ),
        selected: readFileSync(join(directory, 'selected'), 'utf8'),
        pattern: readFileSync(join(directory, 'pattern'), 'utf8'),
        original: readFileSync(join(output, 'host-core-pattern.txt'), 'utf8'),
        directory: readFileSync(join(output, 'host-core-dir.txt'), 'utf8'),
      }).toEqual({
        version: 'Android emulator version 37.2.13\n',
        selected: '/mnt/pte-core.XXXXXX\n',
        pattern: `${coreDirectory}/core.%p.%s\n`,
        original: '|/usr/lib/systemd/systemd-coredump %P %s\n',
        directory: `${coreDirectory}\n`,
      })
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  test('Scenario: A failed debugger install refreshes package lists once and reports missing stacks', () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-core-install-'))
    const output = join(directory, 'out')
    for (const command of [
      'bash',
      'mkdir',
      'df',
      'awk',
      'readlink',
      'timeout',
    ]) {
      symlinkSync(`/usr/bin/${command}`, join(directory, command))
    }
    writeFileSync(
      join(directory, 'cat'),
      '#!/bin/bash\nif [ "$1" = /proc/sys/kernel/core_pattern ]; then printf "foo\\n"; else /bin/cat "$@"; fi\n',
      {mode: 0o755},
    )
    writeFileSync(
      join(directory, 'sudo'),
      '#!/bin/bash\nif [ "$2" = env ] || [ "$2" = apt-get ]; then printf "%s\\n" "$*" >> "$HOST_TEST_INSTALL"; fi\nexit 1\n',
      {mode: 0o755},
    )
    try {
      const result = spawnSync(
        'bash',
        [
          fileURLToPath(new URL('host-core.sh', import.meta.url)),
          'prepare',
          output,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: directory,
            ANDROID_HOME: '',
            HOST_TEST_INSTALL: join(directory, 'install'),
          },
        },
      )
      expect(result.status).toEqual(0)
      expect(readFileSync(join(directory, 'install'), 'utf8')).toEqual(
        '-n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gdb\n-n apt-get update\n-n env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends gdb\n',
      )
      expect(
        readFileSync(join(output, 'host-core-setup.txt'), 'utf8'),
      ).toContain('stacks unavailable: gdb could not be installed\n')
      expect(existsSync(join(output, 'host-core.txt'))).toEqual(false)
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  test('Scenario: Core filenames supply the pid and signal and a debugger failure preserves the evidence', () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-core-'))
    const coreDirectory = join(directory, 'cores')
    const binary = join(directory, 'qemu-system-x86_64')
    mkdirSync(coreDirectory)
    writeFileSync(join(directory, 'host-core-dir.txt'), coreDirectory)
    writeFileSync(
      join(directory, 'host-emulator-version.txt'),
      'Android emulator version 37.2.13\n',
    )
    writeFileSync(join(directory, 'host-exe-4242.txt'), binary)
    writeFileSync(join(coreDirectory, 'core.4242.11'), 'foo')
    writeFileSync(join(coreDirectory, 'core.5151.6'), 'bar')
    writeFileSync(join(coreDirectory, 'unrelated'), 'baz')
    writeFileSync(
      join(directory, 'du'),
      '#!/bin/bash\nprintf "4096\\t%s\\n" "$2"\n',
      {mode: 0o755},
    )
    writeFileSync(
      join(directory, 'gdb'),
      '#!/bin/bash\nprintf "%s\\n" "$@" > "$HOST_GDB_ARGUMENTS"\necho "warning: Can\'t open file /memfd:foo (deleted) during file-backed mapping note processing"\necho "warning: Can\'t open file anon_inode:kvm-vcpu during file-backed mapping note processing"\necho "warning: foo"\necho "#0  faulting_function ()"\nexit 42\n',
      {mode: 0o755},
    )
    try {
      const result = spawnSync(
        'bash',
        [
          fileURLToPath(new URL('host-core.sh', import.meta.url)),
          'capture',
          directory,
        ],
        {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            HOST_GDB_ARGUMENTS: join(directory, 'arguments'),
          },
          encoding: 'utf8',
        },
      )
      expect(result.status).toEqual(0)
      expect(readFileSync(join(directory, 'host-core.txt'), 'utf8')).toEqual(
        `HOST_CORE pid=4242 signal=SIGSEGV\ncore=${coreDirectory}/core.4242.11 size_bytes=3 disk_bytes=4096\nexecutable=${binary}\nAndroid emulator version 37.2.13\nwarning: foo\n#0  faulting_function ()\nHOST_CORE pid=5151 signal=SIGABRT\ncore=${coreDirectory}/core.5151.6 size_bytes=3 disk_bytes=4096\nexecutable=unavailable\nAndroid emulator version 37.2.13\nNo recorded emulator executable for pid 5151\n`,
      )
      expect(readFileSync(join(directory, 'arguments'), 'utf8')).toEqual(
        `-nx\n--batch\n-ex\nset auto-load off\n-ex\nset debuginfod enabled off\n-ex\nset pagination off\n-ex\ninfo program\n-ex\ninfo threads\n-ex\nbt\n-ex\nthread apply all bt 5\n${binary}\n${coreDirectory}/core.4242.11\n`,
      )
      expect(readdirSync(coreDirectory).sort()).toEqual(['unrelated'])
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  test('Scenario: A stopped emulator produces two per-thread captures at least 30 seconds apart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-freeze-'))
    const hostLog = join(directory, 'host.log')
    writeFileSync(
      join(directory, 'sudo'),
      '#!/bin/sh\nprintf unavailable >&2\nexit 1\n',
      {mode: 0o755},
    )
    const fakeEmulator = spawn('sleep', ['137'], {stdio: 'ignore'})
    const samplerProcess = spawn(
      'bash',
      ['-e', '-o', 'pipefail', sampler, hostLog],
      {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          HOST_SAMPLER_PATTERN: '^sleep 137$',
          HOST_SAMPLER_INTERVAL: '0.2',
        },
        stdio: 'ignore',
      },
    )
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(hostLog, 'utf8')).toContain(
            `qemu pid=${fakeEmulator.pid} `,
          )
        },
        {timeout: 10_000},
      )
      fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(
            readFileSync(
              join(directory, `host-freeze-${fakeEmulator.pid}-1.txt`),
              'utf8',
            ),
          ).toEqual(
            expect.stringMatching(
              new RegExp(
                `^tid=${fakeEmulator.pid} comm=sleep state=T wchan=\\S+\\n$`,
              ),
            ),
          )
        },
        {timeout: 10_000},
      )
      const firstCapture = Number(
        readFileSync(hostLog, 'utf8').trim().split('\n').at(-1)?.split(' ')[0],
      )
      await vi.waitFor(
        () => {
          expect(
            readFileSync(
              join(directory, `host-freeze-${fakeEmulator.pid}-2.txt`),
              'utf8',
            ),
          ).toEqual(
            expect.stringMatching(
              new RegExp(
                `^tid=${fakeEmulator.pid} comm=sleep state=T wchan=\\S+\\n$`,
              ),
            ),
          )
        },
        {timeout: 40_000},
      )
      const secondCapture = Number(
        readFileSync(hostLog, 'utf8').trim().split('\n').at(-1)?.split(' ')[0],
      )
      expect(secondCapture - firstCapture >= 30).toEqual(true)
      fakeEmulator.kill('SIGKILL')
      await vi.waitFor(
        () => {
          expect(readFileSync(hostLog, 'utf8')).toContain('QEMU_GONE')
        },
        {timeout: 10_000},
      )
      expect(
        readdirSync(directory)
          .filter((name) => name.startsWith('host-freeze-'))
          .sort(),
      ).toEqual([
        `host-freeze-${fakeEmulator.pid}-1.txt`,
        `host-freeze-${fakeEmulator.pid}-2.txt`,
      ])
    } finally {
      fakeEmulator.kill('SIGKILL')
      samplerProcess.kill('SIGKILL')
      rmSync(directory, {recursive: true, force: true})
    }
  }, 60_000)

  test('Scenario: A kernel stack read that ignores SIGTERM does not stop the sampler', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-freeze-'))
    const hostLog = join(directory, 'host.log')
    writeFileSync(
      join(directory, 'sudo'),
      "#!/bin/sh\ntrap '' TERM\nwhile true; do sleep 0.1; done\n",
      {mode: 0o755},
    )
    const fakeEmulator = spawn('sleep', ['139'], {stdio: 'ignore'})
    const samplerProcess = spawn(
      'bash',
      ['-e', '-o', 'pipefail', sampler, hostLog],
      {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          HOST_SAMPLER_PATTERN: '^sleep 139$',
          HOST_SAMPLER_INTERVAL: '0.2',
        },
        stdio: 'ignore',
      },
    )
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(hostLog, 'utf8')).toContain(
            `qemu pid=${fakeEmulator.pid} `,
          )
        },
        {timeout: 10_000},
      )
      const stoppedAt = Math.floor(Date.now() / 1000)
      fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(
            existsSync(
              join(directory, `host-freeze-${fakeEmulator.pid}-1.txt`),
            ),
          ).toEqual(true)
        },
        {timeout: 10_000},
      )
      await vi.waitFor(
        () => {
          const lastSample = Number(
            readFileSync(hostLog, 'utf8')
              .trim()
              .split('\n')
              .at(-1)
              ?.split(' ')[0],
          )
          expect(lastSample - stoppedAt >= 6).toEqual(true)
        },
        {timeout: 15_000},
      )
    } finally {
      fakeEmulator.kill('SIGKILL')
      samplerProcess.kill('SIGKILL')
      rmSync(directory, {recursive: true, force: true})
    }
  }, 40_000)

  test('Scenario: A hanging sudo with several threads leaves no sample gap above four seconds', async () => {
    const fixture = startFreezeSampler('hanging')
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.hostLog, 'utf8')).toContain(
            `qemu pid=${fixture.fakeEmulator.pid} `,
          )
          expect(
            readdirSync(`/proc/${fixture.fakeEmulator.pid}/task`).length >= 4,
          ).toEqual(true)
        },
        {timeout: 10_000},
      )
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(existsSync(fixture.firstCapture)).toEqual(true)
        },
        {timeout: 10_000},
      )
      const captureSample = readFileSync(fixture.hostLog, 'utf8')
        .trim()
        .split('\n')
        .at(-1)!
      await vi.waitFor(
        () => {
          expect(
            readFileSync(fixture.hostLog, 'utf8').trim().split('\n').at(-1) ===
              captureSample,
          ).toEqual(false)
        },
        {timeout: 25_000},
      )
      const samples = readFileSync(fixture.hostLog, 'utf8')
        .trim()
        .split('\n')
        .map((line) => Number(line.split(' ')[0]))
      expect(
        Math.max(
          ...samples.slice(1).map((sample, index) => sample - samples[index]!),
        ) <= 4,
      ).toEqual(true)
    } finally {
      fixture.cleanup()
    }
  }, 40_000)

  test('Scenario: A stack read that hangs after sudo answers leaves no sample gap above four seconds', async () => {
    const fixture = startFreezeSampler('hanging-stack')
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.hostLog, 'utf8')).toContain(
            `qemu pid=${fixture.fakeEmulator.pid} `,
          )
          expect(
            readdirSync(`/proc/${fixture.fakeEmulator.pid}/task`).length >= 4,
          ).toEqual(true)
        },
        {timeout: 10_000},
      )
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(existsSync(fixture.firstCapture)).toEqual(true)
        },
        {timeout: 10_000},
      )
      const captureSample = readFileSync(fixture.hostLog, 'utf8')
        .trim()
        .split('\n')
        .at(-1)!
      await vi.waitFor(
        () => {
          expect(
            readFileSync(fixture.hostLog, 'utf8').trim().split('\n').at(-1) ===
              captureSample,
          ).toEqual(false)
        },
        {timeout: 25_000},
      )
      const samples = readFileSync(fixture.hostLog, 'utf8')
        .trim()
        .split('\n')
        .map((line) => Number(line.split(' ')[0]))
      expect(
        Math.max(
          ...samples.slice(1).map((sample, index) => sample - samples[index]!),
        ) <= 4,
      ).toEqual(true)
    } finally {
      fixture.cleanup()
    }
  }, 40_000)

  test('Scenario: A recovered freeze cannot use a later single stopped sample for capture two', async () => {
    const fixture = startFreezeSampler('unavailable')
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.hostLog, 'utf8')).toContain(
            `qemu pid=${fixture.fakeEmulator.pid} `,
          )
        },
        {timeout: 10_000},
      )
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.firstCapture, 'utf8')).toContain('tid=')
        },
        {timeout: 10_000},
      )
      const firstSample = Number(
        readFileSync(fixture.hostLog, 'utf8')
          .trim()
          .split('\n')
          .at(-1)!
          .split(' ')[0],
      )
      fixture.fakeEmulator.kill('SIGCONT')
      await vi.waitFor(
        () => {
          const lastSample = readFileSync(fixture.hostLog, 'utf8')
            .trim()
            .split('\n')
            .at(-1)!
          expect(lastSample).toEqual(expect.stringMatching(/state=[SR]$/))
          expect(Number(lastSample.split(' ')[0]) - firstSample > 30).toEqual(
            true,
          )
        },
        {timeout: 40_000},
      )
      const beforeStop = readFileSync(fixture.hostLog, 'utf8')
        .trim()
        .split('\n').length
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(
            readFileSync(fixture.hostLog, 'utf8')
              .trim()
              .split('\n')
              .slice(beforeStop)
              .some((line) => line.endsWith('state=T')),
          ).toEqual(true)
        },
        {timeout: 10_000, interval: 10},
      )
      fixture.fakeEmulator.kill('SIGCONT')
      await vi.waitFor(
        () => {
          expect(
            readFileSync(fixture.hostLog, 'utf8').trim().split('\n').at(-1),
          ).toEqual(expect.stringMatching(/state=[SR]$/))
        },
        {timeout: 10_000},
      )
      expect(existsSync(fixture.secondCapture)).toEqual(false)
    } finally {
      fixture.cleanup()
    }
  }, 60_000)

  test('Scenario: A new freeze rewrites capture one and removes the previous freeze capture two', async () => {
    const fixture = startFreezeSampler('unavailable')
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.hostLog, 'utf8')).toContain(
            `qemu pid=${fixture.fakeEmulator.pid} `,
          )
        },
        {timeout: 10_000},
      )
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.secondCapture, 'utf8')).toContain('tid=')
        },
        {timeout: 40_000},
      )
      fixture.fakeEmulator.kill('SIGCONT')
      await vi.waitFor(
        () => {
          expect(
            readFileSync(fixture.hostLog, 'utf8').trim().split('\n').at(-1),
          ).toEqual(expect.stringMatching(/state=[SR]$/))
        },
        {timeout: 10_000},
      )
      writeFileSync(fixture.firstCapture, 'previous freeze\n')
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.firstCapture, 'utf8')).toContain('tid=')
          expect(existsSync(fixture.secondCapture)).toEqual(false)
        },
        {timeout: 5_000},
      )
    } finally {
      fixture.cleanup()
    }
  }, 60_000)

  test('Scenario: Successful sudo writes each stack after its thread line', async () => {
    const fixture = startFreezeSampler('available')
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(fixture.hostLog, 'utf8')).toContain(
            `qemu pid=${fixture.fakeEmulator.pid} `,
          )
        },
        {timeout: 10_000},
      )
      fixture.fakeEmulator.kill('SIGSTOP')
      await vi.waitFor(
        () => {
          const threadIds = readdirSync(
            `/proc/${fixture.fakeEmulator.pid}/task`,
          ).sort()
          const lines = readFileSync(fixture.firstCapture, 'utf8')
            .trim()
            .split('\n')
          expect(lines.filter((_, index) => index % 2 === 0).sort()).toEqual(
            threadIds.map((threadId) =>
              expect.stringMatching(
                new RegExp(`^tid=${threadId} comm=.+ state=T wchan=\\S+$`),
              ),
            ),
          )
          expect(lines.filter((_, index) => index % 2 === 1).sort()).toEqual(
            threadIds.map(
              (threadId) =>
                `stack /proc/${fixture.fakeEmulator.pid}/task/${threadId}/stack`,
            ),
          )
        },
        {timeout: 10_000},
      )
    } finally {
      fixture.cleanup()
    }
  }, 30_000)

  test('Scenario: The emulator process is killed and the capture stops the sampler', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-scripts-'))
    const crashDirectory = join(directory, 'crash')
    mkdirSync(crashDirectory)
    writeFileSync(join(crashDirectory, 'emu-crash-1'), 'crash data')
    const hostLog = join(directory, 'host.log')
    const fakeEmulator = spawn('sleep', ['31'], {stdio: 'ignore'})
    const samplerProcess = spawn('bash', [sampler, hostLog], {
      env: {
        ...process.env,
        HOST_SAMPLER_PATTERN: '^sleep 31$',
        HOST_SAMPLER_INTERVAL: '0.2',
      },
      stdio: 'ignore',
    })
    try {
      await vi.waitFor(
        () => {
          expect(readFileSync(hostLog, 'utf8')).toContain(
            `qemu pid=${fakeEmulator.pid} `,
          )
        },
        {timeout: 10_000, interval: 50},
      )
      fakeEmulator.kill('SIGKILL')
      await vi.waitFor(
        () => {
          expect(readFileSync(hostLog, 'utf8')).toContain('QEMU_GONE')
        },
        {timeout: 10_000, interval: 50},
      )
      const samplerPid = Number(
        readFileSync(join(directory, 'host-sampler.pid'), 'utf8'),
      )

      const result = spawnSync('bash', [capture, directory], {
        encoding: 'utf8',
        env: {
          ...process.env,
          HOST_DMESG_CMD: 'echo fake-dmesg',
          HOST_CRASH_GLOB: join(crashDirectory, 'emu-crash-*'),
        },
      })

      expect({
        gone: readFileSync(hostLog, 'utf8')
          .split('\n')
          .filter((line) => line.startsWith('QEMU_GONE')),
        samplerPid: samplerPid === samplerProcess.pid,
        status: result.status,
        dmesg: readFileSync(join(directory, 'host-dmesg.txt'), 'utf8'),
        disk: existsSync(join(directory, 'host-disk.txt')),
        memory: existsSync(join(directory, 'host-memory.txt')),
        crash: readdirSync(join(directory, 'emu-crash')),
      }).toEqual({
        gone: [
          expect.stringMatching(
            new RegExp(`^QEMU_GONE pid=${fakeEmulator.pid} at \\d+$`),
          ),
        ],
        samplerPid: true,
        status: 0,
        dmesg: 'fake-dmesg\n',
        disk: true,
        memory: true,
        crash: ['emu-crash-1'],
      })
      await vi.waitFor(
        () => {
          expect(isAlive(samplerPid)).toBe(false)
        },
        {timeout: 10_000, interval: 50},
      )
    } finally {
      fakeEmulator.kill('SIGKILL')
      samplerProcess.kill('SIGKILL')
      rmSync(directory, {recursive: true, force: true})
    }
  }, 30_000)

  test('Scenario: The capture runs with no sampler and a failing kernel log command', () => {
    const directory = mkdtempSync(join(tmpdir(), 'host-scripts-'))
    try {
      const result = spawnSync('bash', [capture, directory], {
        encoding: 'utf8',
        env: {
          ...process.env,
          HOST_DMESG_CMD: 'false',
          HOST_CRASH_GLOB: join(directory, 'no-such-dir', 'emu-crash-*'),
        },
      })

      expect({
        status: result.status,
        files: readdirSync(directory).sort(),
      }).toEqual({
        status: 0,
        files: ['host-disk.txt', 'host-dmesg.txt', 'host-memory.txt'],
      })
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })
})

describeOnLinux(
  'host-capture.sh with a pid file that names another process',
  () => {
    test('Scenario: The pid file names a process that is not the sampler', () => {
      const directory = mkdtempSync(join(tmpdir(), 'host-scripts-'))
      const unrelated = spawn('sleep', ['32'], {stdio: 'ignore'})
      try {
        writeFileSync(
          join(directory, 'host-sampler.pid'),
          String(unrelated.pid),
        )

        const result = spawnSync('bash', [capture, directory], {
          encoding: 'utf8',
          env: {...process.env, HOST_DMESG_CMD: 'true'},
        })

        // A terminated child stays a zombie until the test reaps it, so its state is read, not whether the pid exists.
        const state = readFileSync(`/proc/${unrelated.pid}/stat`, 'utf8')
          .split(') ')[1]!
          .charAt(0)
        expect({status: result.status, state}).toEqual({
          status: 0,
          state: 'S',
        })
      } finally {
        unrelated.kill('SIGKILL')
        rmSync(directory, {recursive: true, force: true})
      }
    })
  },
)

describeOnLinux(
  'host-capture.sh with a pid file that names a process whose argument only contains the sampler name',
  () => {
    test('Scenario: The pid file names a process run with a path that continues past host-sampler.sh', () => {
      const directory = mkdtempSync(join(tmpdir(), 'host-scripts-'))
      const lookalike = spawn(
        'bash',
        ['-c', 'sleep 32; true', '/old/android/scripts/host-sampler.sh.backup'],
        {stdio: 'ignore'},
      )
      try {
        writeFileSync(
          join(directory, 'host-sampler.pid'),
          String(lookalike.pid),
        )

        const result = spawnSync('bash', [capture, directory], {
          encoding: 'utf8',
          env: {...process.env, HOST_DMESG_CMD: 'true'},
        })

        const state = readFileSync(`/proc/${lookalike.pid}/stat`, 'utf8')
          .split(') ')[1]!
          .charAt(0)
        expect({status: result.status, state}).toEqual({
          status: 0,
          state: 'S',
        })
      } finally {
        lookalike.kill('SIGKILL')
        rmSync(directory, {recursive: true, force: true})
      }
    })
  },
)

describeOnLinux(
  'host-capture.sh with a pid file that names a process that has exited',
  () => {
    test('Scenario: The pid file names a process that no longer exists and the capture runs with errexit', () => {
      const directory = mkdtempSync(join(tmpdir(), 'host-scripts-'))
      try {
        const exited = spawnSync('true')
        writeFileSync(join(directory, 'host-sampler.pid'), String(exited.pid))

        const result = spawnSync(
          'bash',
          ['-e', '-o', 'pipefail', capture, directory],
          {encoding: 'utf8', env: {...process.env, HOST_DMESG_CMD: 'true'}},
        )

        expect({
          status: result.status,
          stderr: result.stderr,
          wroteMemory: existsSync(join(directory, 'host-memory.txt')),
        }).toEqual({status: 0, stderr: '', wroteMemory: true})
      } finally {
        rmSync(directory, {recursive: true, force: true})
      }
    })
  },
)

function isAlive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function startFreezeSampler(
  sudo: 'hanging' | 'hanging-stack' | 'unavailable' | 'available',
) {
  const directory = mkdtempSync(join(tmpdir(), 'host-freeze-regression-'))
  const hostLog = join(directory, 'host.log')
  writeFileSync(
    join(directory, 'sudo'),
    sudo === 'hanging'
      ? "#!/bin/sh\ntrap '' TERM\nwhile true; do sleep 0.1; done\n"
      : sudo === 'hanging-stack'
        ? '#!/bin/sh\nif [ "$2" = true ]; then exit 0; fi\ntrap \'\' TERM\nwhile true; do sleep 0.1; done\n'
        : sudo === 'available'
          ? '#!/bin/sh\nshift\nif [ "$1" = true ]; then exit 0; fi\nshift\nprintf "stack %s\\n" "$1"\n'
          : '#!/bin/sh\nexit 1\n',
    {mode: 0o755},
  )
  const emulatorScript = join(directory, 'emulator.cjs')
  writeFileSync(emulatorScript, 'setInterval(() => {}, 1000)\n')
  const fakeEmulator = spawn(process.execPath, [emulatorScript], {
    stdio: 'ignore',
    detached: true,
  })
  const samplerProcess = spawn(
    'bash',
    ['-e', '-o', 'pipefail', sampler, hostLog],
    {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        HOST_SAMPLER_PATTERN: emulatorScript,
        HOST_SAMPLER_INTERVAL: '0.2',
      },
      stdio: 'ignore',
    },
  )
  return {
    hostLog,
    fakeEmulator,
    firstCapture: join(directory, `host-freeze-${fakeEmulator.pid}-1.txt`),
    secondCapture: join(directory, `host-freeze-${fakeEmulator.pid}-2.txt`),
    cleanup() {
      fakeEmulator.kill('SIGKILL')
      samplerProcess.kill('SIGKILL')
      rmSync(directory, {recursive: true, force: true})
    },
  }
}

function startCoreCapture(outerTimeout: boolean) {
  const directory = mkdtempSync(join(tmpdir(), 'host-core-term-'))
  const coreDirectory = join(directory, 'cores')
  mkdirSync(coreDirectory)
  writeFileSync(join(directory, 'host-core-dir.txt'), coreDirectory)
  writeFileSync(join(directory, 'host-core-pattern.txt'), 'foo\n')
  writeFileSync(join(directory, 'host-exe-1234.txt'), '/bin/true')
  writeFileSync(join(coreDirectory, 'core.1234.11'), 'bar')
  writeFileSync(join(coreDirectory, 'core.other'), 'baz')
  writeFileSync(
    join(directory, 'cat'),
    '#!/bin/bash\nif [ "$1" = /proc/sys/kernel/core_pattern ]; then /bin/cat "$HOST_TEST_RESTORED"; else /bin/cat "$@"; fi\n',
    {mode: 0o755},
  )
  writeFileSync(
    join(directory, 'sudo'),
    '#!/bin/bash\n[ "$*" = "-n tee /proc/sys/kernel/core_pattern" ] || exit 1\nfind "$HOST_TEST_CORE_DIRECTORY" -name "core.*" -type f > "$HOST_TEST_CORES_AT_RESTORE.partial"\nmv "$HOST_TEST_CORES_AT_RESTORE.partial" "$HOST_TEST_CORES_AT_RESTORE"\ncat > "$HOST_TEST_RESTORED"\n',
    {mode: 0o755},
  )
  writeFileSync(
    join(directory, 'gdb'),
    '#!/bin/bash\necho "$$" > "$HOST_TEST_GDB_PID"\nexec sleep 30\n',
    {mode: 0o755},
  )
  const script = fileURLToPath(new URL('host-core.sh', import.meta.url))
  const captureProcess = spawn(
    outerTimeout ? 'timeout' : 'bash',
    outerTimeout
      ? ['--kill-after=5', '2', 'bash', script, 'capture', directory]
      : [script, 'capture', directory],
    {
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        HOST_TEST_RESTORED: join(directory, 'restored'),
        HOST_TEST_CORE_DIRECTORY: coreDirectory,
        HOST_TEST_CORES_AT_RESTORE: join(directory, 'cores-at-restore'),
        HOST_TEST_GDB_PID: join(directory, 'gdb.pid'),
      },
      stdio: 'ignore',
      detached: true,
    },
  )
  return {
    directory,
    coreDirectory,
    captureProcess,
    cleanup() {
      if (existsSync(join(directory, 'gdb.pid'))) {
        const debuggerPid = Number(
          readFileSync(join(directory, 'gdb.pid'), 'utf8'),
        )
        try {
          process.kill(debuggerPid, 'SIGKILL')
        } catch {}
      }
      try {
        process.kill(-captureProcess.pid!, 'SIGKILL')
      } catch {}
      rmSync(directory, {recursive: true, force: true})
    },
  }
}
