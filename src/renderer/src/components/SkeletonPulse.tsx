import React from 'react'

interface SkeletonBlockProps {
  width?: string | number
  height?: number
  borderRadius?: number
  style?: React.CSSProperties
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonBlockProps) {
  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.30; }
        }
        .skeleton-block {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
          background: #F4E7E2;
          border-radius: ${borderRadius}px;
        }
      `}</style>
      <div
        className="skeleton-block"
        style={{ width, height, borderRadius, ...style }}
      />
    </>
  )
}

interface SkeletonCardProps {
  style?: React.CSSProperties
}

export function SkeletonCard({ style }: SkeletonCardProps) {
  return (
    <div style={{ background: '#2C1C14', borderRadius: 14, padding: 24, marginBottom: 12, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F4E7E2', opacity: 0.12, flexShrink: 0 }} />
        <SkeletonBlock width={120} height={14} />
      </div>
      <SkeletonBlock width="90%" height={13} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="60%" height={13} style={{ marginBottom: 20 }} />
      <SkeletonBlock width="100%" height={40} borderRadius={10} />
    </div>
  )
}
