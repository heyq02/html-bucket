import { Button, Heading, Label, Link, Stack, TextInput } from '@primer/react'
import { useEffect, useRef, useState } from 'react'

import {
  copyText,
  deletePage,
  formatUpdatedAt,
  messageFromBody,
  pageUrl,
  publishPage,
  setPageEnabled
} from './api.ts'
import type { PageSummary } from './api.ts'
import { StatusBanner } from './StatusBanner.tsx'
import type { StatusTone } from './StatusBanner.tsx'

interface LibrarySectionProps {
  pages: PageSummary[]
  filter: string
  onFilterChange: (value: string) => void
  onReload: () => Promise<void>
  status: { message: string; tone: StatusTone } | null
  onStatus: (message: string, tone?: StatusTone) => void
}

export function LibrarySection({
  pages,
  filter,
  onFilterChange,
  onReload,
  status,
  onStatus
}: LibrarySectionProps) {
  const updateInputRef = useRef<HTMLInputElement>(null)
  const [pendingUpdatePath, setPendingUpdatePath] = useState<string | null>(null)
  const filtered = filter ? pages.filter(page => page.path.includes(filter)) : pages

  useEffect(() => {
    if (!pendingUpdatePath) {
      return
    }
    updateInputRef.current?.click()
  }, [pendingUpdatePath])

  async function handleRefresh() {
    try {
      onStatus('正在刷新列表…', 'info')
      await onReload()
      onStatus('列表已刷新', 'success')
    } catch (error) {
      onStatus(error instanceof Error ? error.message : '刷新失败', 'error')
    }
  }

  async function handleToggle(path: string, enabled: boolean) {
    onStatus(`正在${enabled ? '开启' : '关闭'} /${path}…`, 'info')
    try {
      await setPageEnabled(path, enabled)
      await onReload()
      onStatus(`已${enabled ? '开启' : '关闭'} /${path}`, 'success')
    } catch (error) {
      onStatus(error instanceof Error ? error.message : '更新状态失败', 'error')
    }
  }

  async function handleDelete(path: string) {
    if (!globalThis.confirm(`确认删除 /${path}？`)) {
      onStatus('已取消删除', 'info')
      return
    }
    onStatus(`正在删除 /${path}…`, 'info')
    try {
      await deletePage(path)
      await onReload()
      onStatus(`已删除 /${path}`, 'success')
    } catch (error) {
      onStatus(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  async function handleUpdateFile(file: File | undefined) {
    const path = pendingUpdatePath
    setPendingUpdatePath(null)
    if (updateInputRef.current) {
      updateInputRef.current.value = ''
    }
    if (!path || !file) {
      onStatus('已取消更新', 'info')
      return
    }

    onStatus(`正在更新 /${path}…`, 'info')
    const { ok, body } = await publishPage(file, path, true)
    if (!ok) {
      onStatus(messageFromBody(body, '更新失败'), 'error')
      return
    }
    await onReload()
    onStatus(`已更新 /${path}`, 'success')
  }

  return (
    <section className='panel' aria-labelledby='library-title'>
      <Heading as='h2' id='library-title'>
        页面库
      </Heading>

      <Stack direction={{ narrow: 'vertical', regular: 'horizontal' }} gap='condensed'>
        <div style={{ flex: 1 }}>
          <TextInput
            value={filter}
            onChange={event => {
              onFilterChange(event.target.value)
            }}
            placeholder='按路径筛选'
            block
            aria-label='按路径筛选'
          />
        </div>
        <Button onClick={() => void handleRefresh()}>刷新</Button>
      </Stack>

      {status?.message ? (
        <div style={{ margin: '0.75rem 0' }}>
          <StatusBanner message={status.message} tone={status.tone} />
        </div>
      ) : (
        <div style={{ height: '0.75rem' }} />
      )}

      <input
        ref={updateInputRef}
        type='file'
        accept='.html,text/html'
        hidden
        onChange={event => void handleUpdateFile(event.target.files?.[0])}
      />

      <div className='table-wrap'>
        <table className='pages-table'>
          <thead>
            <tr>
              <th>路径</th>
              <th>状态</th>
              <th>大小</th>
              <th>更新时间</th>
              <th className='actions'>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className='empty-cell'>
                  暂无页面
                </td>
              </tr>
            ) : (
              filtered.map(page => (
                <tr key={page.path} className={page.enabled ? undefined : 'is-disabled'}>
                  <td>
                    <Link
                      href={`/${page.path}`}
                      className={page.enabled ? undefined : 'is-disabled'}
                    >
                      /{page.path}
                    </Link>
                  </td>
                  <td>
                    <Label variant={page.enabled ? 'success' : 'secondary'}>
                      {page.enabled ? '已开启' : '已关闭'}
                    </Label>
                  </td>
                  <td className='muted'>{page.size} bytes</td>
                  <td className='muted'>{formatUpdatedAt(page.updatedAt)}</td>
                  <td className='actions'>
                    <Stack direction='horizontal' gap='condensed' wrap='wrap' justify='end'>
                      <Button
                        size='small'
                        onClick={async () => {
                          try {
                            const url = pageUrl(page.path)
                            await copyText(url)
                            onStatus(`已复制 ${url}`, 'success')
                          } catch {
                            onStatus('复制失败，请手动复制链接', 'error')
                          }
                        }}
                      >
                        复制链接
                      </Button>
                      <Button
                        size='small'
                        onClick={() => void handleToggle(page.path, !page.enabled)}
                      >
                        {page.enabled ? '关闭' : '开启'}
                      </Button>
                      <Button
                        size='small'
                        onClick={() => {
                          onStatus(`请选择新的 HTML 以更新 /${page.path}`, 'info')
                          setPendingUpdatePath(page.path)
                        }}
                      >
                        更新
                      </Button>
                      <Button
                        size='small'
                        variant='danger'
                        onClick={() => void handleDelete(page.path)}
                      >
                        删除
                      </Button>
                    </Stack>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
