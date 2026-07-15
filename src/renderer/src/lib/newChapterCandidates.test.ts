import { describe, it, expect } from 'vitest'
import { getNewChapterCandidates, jidToId } from './newChapterCandidates'
import type { AppState, ChapterCandidate } from '@shared/types'

function candidate(waJid: string, overrides: Partial<ChapterCandidate> = {}): ChapterCandidate {
  return {
    waJid, name: 'Some Group', memberCount: 3, memberJids: [], lastMessageAt: 0,
    score: 50, active: true, ...overrides,
  }
}

function state(overrides: Partial<AppState> = {}): Pick<AppState, 'detectedChapters' | 'chapters' | 'dismissedChapterCandidates'> {
  return {
    detectedChapters: [],
    chapters: [],
    dismissedChapterCandidates: {},
    ...overrides,
  }
}

describe('getNewChapterCandidates', () => {
  it('returns a first-seen candidate as new', () => {
    const s = state({ detectedChapters: [candidate('120363@g.us')] })
    expect(getNewChapterCandidates(s)).toHaveLength(1)
  })

  it('excludes a candidate whose group is already a confirmed chapter', () => {
    const s = state({
      detectedChapters: [candidate('120363@g.us')],
      chapters: [{ id: jidToId('120363@g.us'), name: 'Existing', active: true }],
    })
    expect(getNewChapterCandidates(s)).toHaveLength(0)
  })

  it('excludes a candidate dismissed less than 7 days ago', () => {
    const recentlyDismissed = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const s = state({
      detectedChapters: [candidate('120363@g.us')],
      dismissedChapterCandidates: { '120363@g.us': recentlyDismissed },
    })
    expect(getNewChapterCandidates(s)).toHaveLength(0)
  })

  it('resurfaces a candidate dismissed more than 7 days ago', () => {
    const staleDismiss = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const s = state({
      detectedChapters: [candidate('120363@g.us')],
      dismissedChapterCandidates: { '120363@g.us': staleDismiss },
    })
    expect(getNewChapterCandidates(s)).toHaveLength(1)
  })

  it('handles an undefined dismissedChapterCandidates map without throwing (pre-migration state)', () => {
    const s = {
      detectedChapters: [candidate('120363@g.us')],
      chapters: [],
      dismissedChapterCandidates: undefined as unknown as Record<string, string>,
    }
    expect(() => getNewChapterCandidates(s)).not.toThrow()
    expect(getNewChapterCandidates(s)).toHaveLength(1)
  })

  it('filters a mixed batch correctly', () => {
    const staleDismiss = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const recentDismiss = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    const s = state({
      detectedChapters: [
        candidate('new@g.us'),
        candidate('confirmed@g.us'),
        candidate('recently-dismissed@g.us'),
        candidate('stale-dismissed@g.us'),
      ],
      chapters: [{ id: jidToId('confirmed@g.us'), name: 'Existing', active: true }],
      dismissedChapterCandidates: {
        'recently-dismissed@g.us': recentDismiss,
        'stale-dismissed@g.us': staleDismiss,
      },
    })
    const result = getNewChapterCandidates(s)
    expect(result.map((c) => c.waJid).sort()).toEqual(['new@g.us', 'stale-dismissed@g.us'])
  })
})
