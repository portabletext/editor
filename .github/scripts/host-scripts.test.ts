import {spawn, spawnSync} from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, test, vi} from 'vitest'

const sampler = fileURLToPath(new URL('host-sampler.sh', import.meta.url))
const capture = fileURLToPath(new URL('host-capture.sh', import.meta.url))

// The scripts run on the Linux CI runners and read /proc, which macOS and Windows don't have.
const describeOnLinux = describe.runIf(process.platform === 'linux')

describeOnLinux('host-sampler.sh and host-capture.sh', () => {
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
