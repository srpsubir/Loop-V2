// MAV-265/task #8: shared test double for the whatsmeow Go sidecar's child
// process, replacing the pre-migration Baileys `sock`/`sock.ev` mocks.
//
// stdout/stderr are real Node PassThrough streams so production code's
// `readline.createInterface({ input: child.stdout })` (src/main/whatsapp.ts)
// works unmodified — only `child_process.spawn` itself needs mocking to
// return this object. stdin writes are captured synchronously into
// `sentRaw`/`sentCommands` rather than requiring an async stream-read flush,
// since assertions on "what command did we send" want to run stdlib
// pure-inspection anyway, not exercise the sidecar's parser.
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { vi, type Mock } from 'vitest'

export interface MockSidecarProcess extends EventEmitter {
  stdout: PassThrough
  stderr: PassThrough
  stdin: PassThrough
  sentRaw: string[]
  kill: Mock
}

export function createMockSidecarProcess(): MockSidecarProcess {
  const stdout = new PassThrough()
  const stderr = new PassThrough()
  const stdin = new PassThrough()
  const sentRaw: string[] = []

  const originalWrite = stdin.write.bind(stdin)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(stdin as any).write = (chunk: any, ...rest: any[]) => {
    sentRaw.push(typeof chunk === 'string' ? chunk : chunk.toString())
    return originalWrite(chunk, ...rest)
  }

  const proc = new EventEmitter() as MockSidecarProcess
  proc.stdout = stdout
  proc.stderr = stderr
  proc.stdin = stdin
  proc.sentRaw = sentRaw
  proc.kill = vi.fn().mockReturnValue(true)
  return proc
}

// Every command line sendCommand()/sendCommandAwaitAck() wrote to stdin,
// parsed back into objects, matching sidecar/protocol.go's InEnvelope shape
// ({ v, type: 'command', cmd, id, payload }).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sentCommands(proc: MockSidecarProcess): any[] {
  return proc.sentRaw
    .join('')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

// Simulates one line of sidecar stdout — a single OutEnvelope (sidecar/protocol.go).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function emitSidecarLine(proc: MockSidecarProcess, event: string, payload: any = {}): void {
  proc.stdout.write(JSON.stringify({ v: 1, type: 'event', event, payload }) + '\n')
}

/** Flush pending microtasks so async stream/readline 'line' events land. */
export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
