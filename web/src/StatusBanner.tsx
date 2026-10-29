import { Banner } from '@primer/react'

export type StatusTone = 'info' | 'success' | 'error'

interface StatusBannerProps {
  message: string
  tone?: StatusTone
}

export function StatusBanner({ message, tone = 'info' }: StatusBannerProps) {
  if (!message) {
    return null
  }

  const variant = tone === 'error' ? 'critical' : tone === 'success' ? 'success' : 'info'

  return <Banner variant={variant} title={message} layout='compact' />
}
