import Anthropic from '@anthropic-ai/sdk'
import { ipcMain } from 'electron'

const MODEL = 'claude-sonnet-4-6'
const TIMEOUT_MS = 30_000
const RATE_LIMIT_WAIT_MS = 10_000

class ClaudeClient {
  private static instance: ClaudeClient
  private client: Anthropic | null = null

  static getInstance(): ClaudeClient {
    if (!ClaudeClient.instance) ClaudeClient.instance = new ClaudeClient()
    return ClaudeClient.instance
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env['LOOP_CLAUDE_KEY']
      if (!apiKey) throw new Error('LOOP_CLAUDE_KEY is not set.')
      this.client = new Anthropic({ apiKey })
    }
    return this.client
  }

  async ask(system: string, user: string, attempt = 1): Promise<string> {
    const client = this.getClient()

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Claude request timed out after 30 seconds.')),
        TIMEOUT_MS
      )
    })

    try {
      const response = await Promise.race([
        client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system,
          messages: [{ role: 'user', content: user }],
        }),
        timeoutPromise,
      ])

      clearTimeout(timeoutId!)

      console.log(
        `[Claude] input=${response.usage.input_tokens} output=${response.usage.output_tokens}`
      )

      const block = response.content[0]
      if (block.type !== 'text') throw new Error('Unexpected response type from Claude.')
      return block.text
    } catch (err: unknown) {
      clearTimeout(timeoutId!)

      if (attempt === 1 && err instanceof Anthropic.RateLimitError) {
        console.warn(`[Claude] Rate limited — retrying in ${RATE_LIMIT_WAIT_MS / 1000}s`)
        await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS))
        return this.ask(system, user, 2)
      }

      if (err instanceof Anthropic.AuthenticationError)
        throw new Error('Invalid API key. Check your LOOP_CLAUDE_KEY setting.')
      if (err instanceof Anthropic.RateLimitError)
        throw new Error('Too many requests. Try again in a moment.')
      if (err instanceof Anthropic.APIConnectionError)
        throw new Error('No internet connection.')
      if (err instanceof Error) throw new Error(err.message)
      throw new Error('Something went wrong with the AI request.')
    }
  }
}

export default ClaudeClient

export function registerClaudeHandlers(): void {
  ipcMain.handle('claude:ask', async (_e, system: string, user: string) => {
    return ClaudeClient.getInstance().ask(system, user)
  })
}
