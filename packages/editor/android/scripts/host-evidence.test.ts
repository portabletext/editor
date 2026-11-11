import {describe, expect, test} from 'vitest'
import {hostEvidence} from './emulator-runs.mjs'

// 1762772400 is 11:00:00 UTC.
describe(hostEvidence.name, () => {
  test('Scenario: The emulator exits mid-run and the kernel log names an out of memory kill', () => {
    expect(
      hostEvidence(
        [
          '1762772398 812000 0 1.50 qemu pid=4242 rss_kb=4100000 state=S',
          'QEMU_GONE pid=4242 at 1762772400',
          '',
        ].join('\n'),
        '[Mon Nov 10 11:00:00 2025] Out of memory: Killed process 4242 (qemu-system-x86) total-vm:9000000kB\n',
        'EMULATOR_START at 1762772000\nBOOTED at 1762772060\n',
      ),
    ).toEqual([
      'host evidence: emulator process 4242 exited at 11:00:00 UTC, mid-run, host OOM',
    ])
  })

  test('Scenario: The emulator exits mid-run and the kernel log names a segfault', () => {
    expect(
      hostEvidence(
        'QEMU_GONE pid=4242 at 1762772400\n',
        '[Mon Nov 10 11:00:00 2025] qemu-system-x86[4242]: segfault at 0 ip 00007f sp 00007ffc error 4\n',
        'EMULATOR_START at 1762772000\nBOOTED at 1762772060\n',
      ),
    ).toEqual([
      'host evidence: emulator process 4242 exited at 11:00:00 UTC, mid-run, emulator crashed',
    ])
  })

  test('Scenario: The emulator exits mid-run and the kernel log has nothing for it', () => {
    expect(
      hostEvidence(
        'QEMU_GONE pid=4242 at 1762772400\n',
        '[Mon Nov 10 11:00:00 2025] Out of memory: Killed process 777 (qemu-system-x86) total-vm:9000000kB\n',
        'EMULATOR_START at 1762772000\nBOOTED at 1762772060\n',
      ),
    ).toEqual([
      'host evidence: emulator process 4242 exited at 11:00:00 UTC, mid-run',
    ])
  })

  test('Scenario: The emulator exits within two minutes after the run is done', () => {
    expect(
      hostEvidence(
        'QEMU_GONE pid=4242 at 1762772455\n',
        '',
        'EMULATOR_START at 1762772000\nBOOTED at 1762772060\nDONE at 1762772400\n',
      ),
    ).toEqual([
      'host evidence: emulator process 4242 exited at 11:00:55 UTC, at teardown',
    ])
  })

  test('Scenario: The emulator exits more than two minutes after the run is done', () => {
    expect(
      hostEvidence(
        'QEMU_GONE pid=4242 at 1762772521\n',
        '',
        'DONE at 1762772400\n',
      ),
    ).toEqual([
      'host evidence: emulator process 4242 exited at 11:02:01 UTC, mid-run',
    ])
  })

  test('Scenario: The retry boots a second emulator and both exits are named', () => {
    expect(
      hostEvidence(
        [
          'QEMU_GONE pid=4242 at 1762772400',
          '1762772410 812000 0 0.50 qemu pid=5151 rss_kb=4100000 state=S',
          'QEMU_GONE pid=5151 at 1762773000',
          '',
        ].join('\n'),
        '[Mon Nov 10 11:00:00 2025] Out of memory: Killed process 4242 (qemu-system-x86) total-vm:9000000kB\n',
        'EMULATOR_START at 1762772000\nRETRY\nEMULATOR_START at 1762772410\nDONE at 1762772990\n',
      ),
    ).toEqual([
      'host evidence: emulator process 4242 exited at 11:00:00 UTC, mid-run, host OOM',
      'host evidence: emulator process 5151 exited at 11:10:00 UTC, at teardown',
    ])
  })

  test('Scenario: The retry exits mid-run and only the first run was done', () => {
    expect(
      hostEvidence(
        'QEMU_GONE pid=5151 at 1762772400\n',
        '',
        'EMULATOR_START at 1762772000\nDONE at 1762772390\nRETRY\nEMULATOR_START at 1762772395\nBOOTED at 1762772398\n',
      ),
    ).toEqual([
      'host evidence: emulator process 5151 exited at 11:00:00 UTC, mid-run',
    ])
  })

  test('Scenario: Every run starts after the exit and one of them has an earlier done line', () => {
    expect(
      hostEvidence(
        'QEMU_GONE pid=5151 at 1762772400\n',
        '',
        'EMULATOR_START at 1762772450\nDONE at 1762772399\nRETRY\nEMULATOR_START at 1762772500\n',
      ),
    ).toEqual([
      'host evidence: emulator process 5151 exited at 11:00:00 UTC, mid-run',
    ])
  })

  test('Scenario: The sampler never saw the emulator exit', () => {
    expect(
      hostEvidence(
        '1762772398 812000 0 1.50 qemu pid=4242 rss_kb=4100000 state=S\n',
        '',
        'DONE at 1762772400\n',
      ),
    ).toEqual(['host evidence: the host sampler saw no emulator process exit'])
  })

  test('Scenario: There is no sampler log', () => {
    expect([
      hostEvidence('', 'anything\n', 'DONE at 1762772400\n'),
      hostEvidence('\n', '', ''),
    ]).toEqual([
      ['host evidence: no host sampler log'],
      ['host evidence: no host sampler log'],
    ])
  })
})
