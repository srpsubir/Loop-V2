// MAV-179 + MAV-180 — Privacy notice + LLM consent screen tests
// Verifies: Continue is disabled until consent checkbox is checked,
// and accepting calls onAccept exactly once.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { PrivacyNoticeScreen } from '../renderer/src/screens/PrivacyNoticeScreen'

describe('PrivacyNoticeScreen (MAV-179 + MAV-180)', () => {
  it('renders the privacy notice headings', () => {
    render(React.createElement(PrivacyNoticeScreen, { onAccept: vi.fn() }))
    expect(screen.getByText('Before we start')).toBeInTheDocument()
    expect(screen.getByText('What Loop reads')).toBeInTheDocument()
    expect(screen.getByText('Everything stays on this Mac')).toBeInTheDocument()
    expect(screen.getByText('Your local AI writes your stories')).toBeInTheDocument()
    expect(screen.getByText('Delete everything, any time')).toBeInTheDocument()
  })

  it('Continue button is disabled before consent checkbox is checked', () => {
    render(React.createElement(PrivacyNoticeScreen, { onAccept: vi.fn() }))
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('Continue button is enabled after checking the consent checkbox', async () => {
    render(React.createElement(PrivacyNoticeScreen, { onAccept: vi.fn() }))
    await act(async () => {
      await userEvent.click(screen.getByRole('checkbox'))
    })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('does not call onAccept when Continue is clicked without consent', async () => {
    const onAccept = vi.fn()
    render(React.createElement(PrivacyNoticeScreen, { onAccept }))
    // Button is disabled, but guard against any programmatic call
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    })
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('calls onAccept exactly once after checking consent and clicking Continue', async () => {
    const onAccept = vi.fn()
    render(React.createElement(PrivacyNoticeScreen, { onAccept }))
    await act(async () => {
      await userEvent.click(screen.getByRole('checkbox'))
    })
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    })
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('shows the LLM consent copy', () => {
    render(React.createElement(PrivacyNoticeScreen, { onAccept: vi.fn() }))
    expect(
      screen.getByText(/I consent to Loop reading my recent message content locally/i)
    ).toBeInTheDocument()
  })
})
