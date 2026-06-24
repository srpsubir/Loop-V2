import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { net } from 'electron'
import type { Contact, Story, Chapter, Occasion } from '../shared/types'
import type { WAMessage } from './whatsapp'

// ─── Model config ─────────────────────────────────────────────────────────────

const MODEL_FILENAME = 'qwen2.5-1.5b-q4_k_m.gguf'
const MODEL_DIR      = path.join(os.homedir(), '.loop', 'models')
const MODEL_PATH     = path.join(MODEL_DIR, MODEL_FILENAME)
// HuggingFace GGUF for Qwen2.5-1.5B-Instruct Q4_K_M (~935 MB)
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf'

// ─── Singleton state ──────────────────────────────────────────────────────────

let _llama: unknown = null
let _model: unknown = null
let _ctx: unknown   = null
let _ready          = false
let _loading        = false
let _downloadActive = false

export function isModelReady(): boolean   { return _ready }
export function isDownloading(): boolean  { return _downloadActive }

export function modelExists(): boolean {
  try { fs.accessSync(MODEL_PATH, fs.constants.R_OK); return true }
  catch { return false }
}

// ─── Download ─────────────────────────────────────────────────────────────────

export type DownloadProgressCallback = (downloadedBytes: number, totalBytes: number) => void

export async function downloadModel(onProgress?: DownloadProgressCallback): Promise<void> {
  if (_downloadActive) throw new Error('Download already in progress')
  if (modelExists()) return

  _downloadActive = true
  await fs.promises.mkdir(MODEL_DIR, { recursive: true })

  const tmpPath = MODEL_PATH + '.tmp'

  return new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(tmpPath)
    let downloaded = 0

    const request = net.request({ url: MODEL_URL, redirect: 'follow' })

    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        file.destroy()
        fs.unlink(tmpPath, () => {})
        _downloadActive = false
        reject(new Error(`HTTP ${response.statusCode} from model CDN`))
        return
      }

      const total = parseInt(response.headers['content-length']?.toString() ?? '0', 10)

      response.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        file.write(chunk)
        onProgress?.(downloaded, total)
      })

      response.on('end', () => {
        file.end(() => {
          fs.rename(tmpPath, MODEL_PATH, (err) => {
            _downloadActive = false
            if (err) { reject(err) } else { resolve() }
          })
        })
      })

      response.on('error', (err: Error) => {
        file.destroy()
        fs.unlink(tmpPath, () => {})
        _downloadActive = false
        reject(err)
      })
    })

    request.on('error', (err: Error) => {
      file.destroy()
      fs.unlink(tmpPath, () => {})
      _downloadActive = false
      reject(err)
    })

    request.end()
  })
}

// ─── Model init ───────────────────────────────────────────────────────────────

export async function initModel(): Promise<void> {
  if (_ready || _loading) return
  if (!modelExists()) throw new Error('Model not downloaded — call downloadModel() first')

  _loading = true
  try {
    const { getLlama } = await import('node-llama-cpp')
    _llama = await getLlama()
    _model = await (_llama as any).loadModel({ modelPath: MODEL_PATH })
    _ctx   = await (_model as any).createContext({ contextSize: 2048 })
    _ready = true
    console.log('[Inference] Qwen2.5-1.5B loaded, ready')
  } catch (err) {
    console.error('[Inference] Failed to load model:', err)
    throw err
  } finally {
    _loading = false
  }
}

// ─── Message filter (inline to avoid circular dep with scanner.ts) ───────────

function isRealMsg(msg: WAMessage): boolean {
  if (!msg.text) return false
  const text = msg.text.trim()
  if (text.length <= 2) return false
  const stripped = text.replace(/[\u{FE0F}\u{20E3}\u{200D}]/gu, '')
  if (/^\p{Emoji}+$/u.test(stripped)) return false
  if (['[Voice Note]', '[Sticker]', '[Image]', '[Video]'].includes(text)) return false
  return true
}

// ─── SLM story generation ─────────────────────────────────────────────────────

export async function generateStoryWithSLM(
  contact: Contact,
  messages: WAMessage[],
  chapters: Chapter[],
  nextOccasion: Occasion | null
): Promise<Story> {
  if (!_ready || !_ctx) throw new Error('Model not ready')

  const { LlamaChatSession } = await import('node-llama-cpp')

  const firstName    = contact.name.split(' ')[0]
  const chapterNames = chapters
    .filter((ch) => contact.chapterIds.includes(ch.id))
    .map((ch) => ch.name)
    .join(', ')

  // Last 5 real messages, newest first (Baileys order)
  const snippets = messages
    .filter(isRealMsg)
    .slice(0, 5)
    .map((m) => `${m.fromMe ? 'Me' : firstName}: ${m.text?.slice(0, 120)}`)
    .join('\n')

  const systemPrompt =
    'You write warm, personal 2-sentence summaries of friendships based on message history. ' +
    'Be specific and grounded. Only reference what is in the messages. Do not invent facts. ' +
    'Output valid JSON only — no prose outside the JSON object.'

  const userPrompt = [
    `Friend: ${firstName}`,
    chapterNames ? `Chapters you share: ${chapterNames}` : null,
    nextOccasion  ? `Current occasion: ${nextOccasion.label}` : null,
    '',
    'Recent messages:',
    snippets || '(no recent messages available)',
    '',
    'Output JSON exactly: {"contextLines": ["sentence 1", "sentence 2"], "reasonToReachOut": "one warm sentence"}',
  ].filter(Boolean).join('\n')

  const sequence = (_ctx as any).getSequence()
  const session  = new LlamaChatSession({ contextSequence: sequence, systemPrompt })

  let raw = ''
  try {
    raw = await session.prompt(userPrompt, {
      temperature: 0.3,
      topP: 0.9,
      maxTokens: 150,
    })

    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('No JSON block in output')

    const parsed = JSON.parse(match[0]) as { contextLines?: string[]; reasonToReachOut?: string }

    if (!Array.isArray(parsed.contextLines) || parsed.contextLines.length === 0) {
      throw new Error('contextLines missing or empty')
    }

    return {
      generatedAt: new Date().toISOString(),
      contextLines: parsed.contextLines.slice(0, 3).map((s) => String(s).trim()),
      reasonToReachOut:
        (typeof parsed.reasonToReachOut === 'string' && parsed.reasonToReachOut.trim())
          ? parsed.reasonToReachOut.trim()
          : (nextOccasion?.label ?? `A good time to check in with ${firstName}.`),
    }
  } catch (err) {
    console.warn('[Inference] Parse failed, falling back to template. Raw output:', raw?.slice(0, 200))
    throw err
  } finally {
    try { sequence.dispose() } catch { /* ignore */ }
  }
}
