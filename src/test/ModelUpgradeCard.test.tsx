import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModelUpgradeCard } from '../renderer/src/components/ModelUpgradeCard'

describe('ModelUpgradeCard — idle state', () => {
  it('renders headline', () => {
    render(<ModelUpgradeCard />)
    expect(screen.getByText('Your stories could be richer.')).toBeInTheDocument()
  })

  it('renders upgrade button', () => {
    render(<ModelUpgradeCard />)
    expect(screen.getByRole('button', { name: /Enable richer stories/i })).toBeInTheDocument()
  })

  it('renders dismiss button', () => {
    render(<ModelUpgradeCard />)
    expect(screen.getByRole('button', { name: /Dismiss/i })).toBeInTheDocument()
  })

  it('calls onDismiss when X clicked', () => {
    const onDismiss = vi.fn()
    render(<ModelUpgradeCard onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onUpgrade when upgrade button clicked', () => {
    const onUpgrade = vi.fn()
    render(<ModelUpgradeCard onUpgrade={onUpgrade} />)
    fireEvent.click(screen.getByRole('button', { name: /Enable richer stories/i }))
    expect(onUpgrade).toHaveBeenCalledOnce()
  })

  it('shows Wi-Fi subtext', () => {
    render(<ModelUpgradeCard />)
    expect(screen.getByText(/Wi-Fi recommended/i)).toBeInTheDocument()
  })
})

describe('ModelUpgradeCard — downloading state', () => {
  it('renders downloading headline', () => {
    render(<ModelUpgradeCard status="downloading" progress={0} />)
    expect(screen.getByText(/Downloading conversation reader/i)).toBeInTheDocument()
  })

  it('shows 0 MB of 935 MB at progress=0', () => {
    render(<ModelUpgradeCard status="downloading" progress={0} />)
    expect(screen.getByText(/0 MB of 935 MB/)).toBeInTheDocument()
  })

  it('shows 468 MB of 935 MB at progress=50', () => {
    render(<ModelUpgradeCard status="downloading" progress={50} />)
    expect(screen.getByText(/468 MB of 935 MB/)).toBeInTheDocument()
  })

  it('shows 935 MB of 935 MB at progress=100', () => {
    render(<ModelUpgradeCard status="downloading" progress={100} />)
    expect(screen.getByText(/935 MB of 935 MB/)).toBeInTheDocument()
  })

  it('renders Cancel button', () => {
    render(<ModelUpgradeCard status="downloading" progress={0} />)
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
  })

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn()
    render(<ModelUpgradeCard status="downloading" progress={0} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not render dismiss X in downloading state', () => {
    render(<ModelUpgradeCard status="downloading" progress={50} />)
    expect(screen.queryByRole('button', { name: /Dismiss/i })).not.toBeInTheDocument()
  })
})

describe('ModelUpgradeCard — complete state', () => {
  it('renders complete headline', () => {
    render(<ModelUpgradeCard status="complete" />)
    expect(screen.getByText('Conversation reader ready.')).toBeInTheDocument()
  })

  it('renders completion body text', () => {
    render(<ModelUpgradeCard status="complete" />)
    expect(screen.getByText(/Your next scan will use your actual conversations/i)).toBeInTheDocument()
  })

  it('renders closing notice', () => {
    render(<ModelUpgradeCard status="complete" />)
    expect(screen.getByText(/This card will close shortly/i)).toBeInTheDocument()
  })

  it('does not render upgrade button in complete state', () => {
    render(<ModelUpgradeCard status="complete" />)
    expect(screen.queryByRole('button', { name: /Enable richer stories/i })).not.toBeInTheDocument()
  })
})
