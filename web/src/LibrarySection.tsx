import {
  ActionList,
  ActionMenu,
  Button,
  CounterLabel,
  Dialog,
  Heading,
  Label,
  Link,
  LinkButton,
  Spinner,
  Stack,
  Text,
  TextInput
} from '@primer/react'
import { forwardRef, useEffect, useId, useRef, useState } from 'react'

import {
  copyText,
  deletePage,
  formatBytes,
  formatUpdatedAt,
  messageFromBody,
  pageUrl,
  publishPage,
  setPageEnabled,
  validateHtmlUpload
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

export const LibrarySection = forwardRef<HTMLElement, LibrarySectionProps>(
  ({ pages, filter, onFilterChange, onReload, status, onStatus }, ref) => {
    const updateInputRef = useRef<HTMLInputElement>(null)
    const filterId = useId()
    const [pendingUpdatePath, setPendingUpdatePath] = useState<string | null>(null)
    const [deletePath, setDeletePath] = useState<string | null>(null)
    const [busyPath, setBusyPath] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)

    const trimmedFilter = filter.trim()
    const filtered = trimmedFilter ? pages.filter(page => page.path.includes(trimmedFilter)) : pages
    const enabledCount = pages.filter(page => page.enabled).length

    useEffect(() => {
      if (!pendingUpdatePath) {
        return
      }
      updateInputRef.current?.click()
    }, [pendingUpdatePath])

    async function handleRefresh() {
      setRefreshing(true)
      try {
        onStatus('正在刷新列表…', 'info')
        await onReload()
        onStatus('列表已刷新', 'success')
      } catch (error) {
        onStatus(error instanceof Error ? error.message : '刷新失败', 'error')
      } finally {
        setRefreshing(false)
      }
    }

    async function handleToggle(path: string, enabled: boolean) {
      setBusyPath(path)
      onStatus(`正在${enabled ? '开启' : '关闭'} /${path}…`, 'info')
      try {
        await setPageEnabled(path, enabled)
        await onReload()
        onStatus(
          enabled ? `已开启 /${path}，访客可访问` : `已关闭 /${path}，访问将返回 404`,
          'success'
        )
      } catch (error) {
        onStatus(error instanceof Error ? error.message : '更新状态失败', 'error')
      } finally {
        setBusyPath(null)
      }
    }

    async function confirmDelete() {
      const path = deletePath
      if (!path) {
        return
      }
      setDeletePath(null)
      setBusyPath(path)
      onStatus(`正在删除 /${path}…`, 'info')
      try {
        await deletePage(path)
        await onReload()
        onStatus(`已删除 /${path}`, 'success')
      } catch (error) {
        onStatus(error instanceof Error ? error.message : '删除失败', 'error')
      } finally {
        setBusyPath(null)
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

      const error = validateHtmlUpload(file)
      if (error) {
        onStatus(error, 'error')
        return
      }

      setBusyPath(path)
      onStatus(`正在更新 /${path}（${file.name}）…`, 'info')
      try {
        const { ok, body } = await publishPage(file, path, true)
        if (!ok) {
          onStatus(messageFromBody(body, '更新失败'), 'error')
          return
        }
        await onReload()
        onStatus(`已更新 /${path}`, 'success')
      } finally {
        setBusyPath(null)
      }
    }

    async function handleCopy(path: string) {
      try {
        await copyText(pageUrl(path))
        onStatus('已复制链接', 'success')
      } catch {
        onStatus('复制失败，请手动复制链接', 'error')
      }
    }

    return (
      <section className='panel' aria-labelledby='library-title' ref={ref}>
        <header className='panel-head panel-head-row'>
          <div>
            <Heading as='h2' id='library-title'>
              页面库
            </Heading>
            <Text as='p' className='panel-desc'>
              管理已发布页面：复制链接、启停访问、覆盖更新或删除。
            </Text>
          </div>
          {pages.length > 0 ? (
            <CounterLabel variant='secondary'>
              {enabledCount}/{pages.length} 可用
            </CounterLabel>
          ) : null}
        </header>

        <Stack
          direction={{ narrow: 'vertical', regular: 'horizontal' }}
          gap='condensed'
          align='center'
        >
          <div className='filter-field'>
            <TextInput
              id={filterId}
              value={filter}
              onChange={event => {
                onFilterChange(event.target.value)
              }}
              placeholder='按路径筛选，例如 demos/'
              block
              aria-label='按路径筛选'
            />
          </div>
          {filter ? (
            <Button
              onClick={() => {
                onFilterChange('')
              }}
            >
              清除
            </Button>
          ) : null}
          <Button onClick={() => void handleRefresh()} disabled={refreshing}>
            {refreshing ? '刷新中…' : '刷新'}
          </Button>
        </Stack>

        {status?.message ? (
          <div className='status-slot'>
            <StatusBanner message={status.message} tone={status.tone} />
          </div>
        ) : (
          <div className='status-slot-spacer' />
        )}

        <input
          ref={updateInputRef}
          type='file'
          accept='.html,.htm,text/html'
          hidden
          onChange={event => void handleUpdateFile(event.target.files?.[0])}
        />

        {pages.length === 0 ? (
          <div className='empty-state'>
            <Text weight='medium'>还没有页面</Text>
            <Text as='p' className='empty-state-hint'>
              在上方「发布」拖入或选择 HTML，确认路径后即可分享。
            </Text>
          </div>
        ) : filtered.length === 0 ? (
          <div className='empty-state'>
            <Text weight='medium'>没有匹配「{trimmedFilter}」的路径</Text>
            <Button
              size='small'
              onClick={() => {
                onFilterChange('')
              }}
            >
              清除筛选
            </Button>
          </div>
        ) : (
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
                {filtered.map(page => {
                  const busy = busyPath === page.path
                  return (
                    <tr key={page.path} className={page.enabled ? undefined : 'is-disabled'}>
                      <td>
                        {page.enabled ? (
                          <Link href={`/${page.path}`} target='_blank' rel='noreferrer'>
                            /{page.path}
                          </Link>
                        ) : (
                          <Text as='span' className='path-disabled' title='已关闭：打开将返回 404'>
                            /{page.path}
                          </Text>
                        )}
                      </td>
                      <td>
                        <Label variant={page.enabled ? 'success' : 'secondary'}>
                          {page.enabled ? '已开启' : '已关闭'}
                        </Label>
                      </td>
                      <td className='muted'>{formatBytes(page.size)}</td>
                      <td className='muted' title={page.updatedAt}>
                        {formatUpdatedAt(page.updatedAt)}
                      </td>
                      <td className='actions'>
                        <Stack
                          direction='horizontal'
                          gap='condensed'
                          wrap='wrap'
                          justify='end'
                          align='center'
                        >
                          {busy ? <Spinner size='small' /> : null}
                          <Button
                            size='small'
                            disabled={busy}
                            onClick={() => void handleCopy(page.path)}
                          >
                            复制链接
                          </Button>
                          {page.enabled ? (
                            <LinkButton
                              size='small'
                              href={`/${page.path}`}
                              target='_blank'
                              rel='noreferrer'
                              disabled={busy}
                            >
                              打开
                            </LinkButton>
                          ) : null}
                          <ActionMenu>
                            <ActionMenu.Button size='small' disabled={busy}>
                              更多
                            </ActionMenu.Button>
                            <ActionMenu.Overlay width='auto'>
                              <ActionList>
                                <ActionList.Item
                                  onSelect={() => void handleToggle(page.path, !page.enabled)}
                                >
                                  {page.enabled ? '关闭访问' : '开启访问'}
                                </ActionList.Item>
                                <ActionList.Item
                                  onSelect={() => {
                                    onStatus(`请选择新的 HTML 以更新 /${page.path}`, 'info')
                                    setPendingUpdatePath(page.path)
                                  }}
                                >
                                  用新文件覆盖
                                </ActionList.Item>
                                <ActionList.Divider />
                                <ActionList.Item
                                  variant='danger'
                                  onSelect={() => {
                                    setDeletePath(page.path)
                                  }}
                                >
                                  删除…
                                </ActionList.Item>
                              </ActionList>
                            </ActionMenu.Overlay>
                          </ActionMenu>
                        </Stack>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {deletePath ? (
          <Dialog
            title='确认删除'
            onClose={() => {
              setDeletePath(null)
            }}
            footerButtons={[
              {
                content: '取消',
                onClick: () => {
                  setDeletePath(null)
                }
              },
              {
                content: '删除',
                buttonType: 'danger',
                onClick: () => {
                  void confirmDelete()
                }
              }
            ]}
          >
            <Text as='p'>
              将永久删除{' '}
              <Text as='span' weight='medium'>
                /{deletePath}
              </Text>
              ，链接立刻失效且无法恢复。
            </Text>
          </Dialog>
        ) : null}
      </section>
    )
  }
)
