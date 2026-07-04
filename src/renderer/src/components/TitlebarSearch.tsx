import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Contact, Chapter } from '@shared/types'

const SERIF = '"Lora", Georgia, "Times New Roman", serif'
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'

interface Props {
  onNavigateContact?: (contactId: string) => void
}

interface ContactResult {
  contact: Contact
  chapterName: string | null
}

interface ChapterResult {
  chapter: Chapter
}

function initial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

function yearRange(ch: Chapter): string {
  const start = ch.startYear ?? ''
  const end = ch.endYear ?? 'present'
  return start ? `${start} - ${end}` : ''
}

export function TitlebarSearch({ onNavigateContact }: Props) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([
      window.loop.contacts.list().catch(() => [] as Contact[]),
      window.loop.state.get().then((s) => s.chapters ?? []).catch(() => [] as Chapter[]),
    ]).then(([c, ch]) => {
      setContacts(c)
      setChapters(ch)
    })
  }, [])

  const q = query.trim().toLowerCase()

  const matchedContacts: ContactResult[] = q
    ? contacts
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((contact) => {
          const ch = chapters.find((ch) => contact.chapterIds?.includes(ch.id))
          return { contact, chapterName: ch?.name ?? null }
        })
    : []

  const matchedChapters: ChapterResult[] = q
    ? chapters.filter((ch) => ch.name.toLowerCase().includes(q)).slice(0, 5).map((chapter) => ({ chapter }))
    : []

  const hasResults = matchedContacts.length > 0 || matchedChapters.length > 0
  const showDropdown = focused && q.length > 0

  const handleBlur = useCallback(() => {
    blurTimer.current = setTimeout(() => setFocused(false), 150)
  }, [])

  const handleFocus = useCallback(() => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setFocused(true)
  }, [])

  const handleContactClick = useCallback((contactId: string) => {
    setQuery('')
    setFocused(false)
    onNavigateContact?.(contactId)
  }, [onNavigateContact])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search people or chapters..."
        style={{
          width: 240,
          height: 28,
          borderRadius: 999,
          border: focused
            ? '1px solid #B8624A'
            : '1px solid rgba(26,16,12,0.12)',
          background: 'rgba(26,16,12,0.07)',
          outline: 'none',
          padding: '0 12px',
          fontFamily: SANS,
          fontSize: 12,
          color: '#1A100C',
          boxSizing: 'border-box',
          boxShadow: focused
            ? '0 0 0 3px rgba(184,98,74,0.15)'
            : 'none',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        } as React.CSSProperties}
      />

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            background: '#FFFFFF',
            borderRadius: 10,
            boxShadow: '0 4px 24px rgba(26,16,12,0.14), 0 1px 4px rgba(26,16,12,0.08)',
            zIndex: 200,
            overflow: 'hidden',
            border: '1px solid rgba(26,16,12,0.08)',
          }}
        >
          {!hasResults && (
            <div
              style={{
                padding: '16px 0',
                textAlign: 'center',
                fontFamily: SANS,
                fontSize: 13,
                color: '#7A6056',
                fontStyle: 'italic',
              }}
            >
              Nothing found
            </div>
          )}

          {matchedContacts.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontFamily: SANS,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#7A6056',
                }}
              >
                People
              </div>
              {matchedContacts.map(({ contact, chapterName }) => (
                <button
                  key={contact.id}
                  onMouseDown={() => handleContactClick(contact.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '7px 14px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,16,12,0.04)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#B8624A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: SERIF,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {initial(contact.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: SERIF,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#1A100C',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {contact.name}
                    </div>
                    {chapterName && (
                      <div
                        style={{
                          fontFamily: SANS,
                          fontSize: 11,
                          color: '#7A6056',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {chapterName}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {matchedChapters.length > 0 && (
            <div style={{ borderTop: matchedContacts.length > 0 ? '1px solid rgba(26,16,12,0.06)' : 'none' }}>
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontFamily: SANS,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#7A6056',
                }}
              >
                Chapters
              </div>
              {matchedChapters.map(({ chapter }) => (
                <div
                  key={chapter.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 14px',
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      fontFamily: SERIF,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#1A100C',
                    }}
                  >
                    {chapter.name}
                  </div>
                  {yearRange(chapter) && (
                    <div
                      style={{
                        fontFamily: SANS,
                        fontSize: 11,
                        color: '#7A6056',
                        marginLeft: 2,
                      }}
                    >
                      {yearRange(chapter)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
