export interface PageSummary {
  path: string
  size: number
  updatedAt: string
  enabled: boolean
}

export interface PublishResult {
  path: string
  url: string
}

function messageFromBody(body: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(body.message)) {
    return body.message.join(', ')
  }
  return body.message ?? fallback
}

export async function listPages(): Promise<PageSummary[]> {
  const res = await fetch(`/api/pages?_=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('加载列表失败')
  }
  return res.json() as Promise<PageSummary[]>
}

export async function publishPage(
  file: File,
  path: string,
  overwrite = false
): Promise<{
  ok: boolean
  status: number
  body: { message?: string | string[] } & Partial<PublishResult>
}> {
  const data = new FormData()
  data.set('path', path)
  data.set('file', file, file.name)
  if (overwrite) {
    data.set('overwrite', 'true')
  }

  const res = await fetch('/api/pages', { method: 'POST', body: data })
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | string[]
  } & Partial<PublishResult>
  return { ok: res.ok, status: res.status, body }
}

export async function setPageEnabled(path: string, enabled: boolean): Promise<void> {
  const res = await fetch('/api/pages', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, enabled }),
    cache: 'no-store'
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] }
    throw new Error(messageFromBody(body, '更新状态失败'))
  }
}

export async function deletePage(path: string): Promise<void> {
  const res = await fetch(`/api/pages?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
    cache: 'no-store'
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] }
    throw new Error(messageFromBody(body, '删除失败'))
  }
}

export function pageUrl(path: string): string {
  return `${globalThis.location.origin}/${path}`
}

export function defaultPathFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  return base.replace(/\.html?$/i, '') || base
}

export function formatUpdatedAt(value: string | undefined): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export { messageFromBody }
