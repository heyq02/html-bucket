import { Heading, Spinner, Stack, Text } from '@primer/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { listPages } from './api.ts'
import type { PageSummary } from './api.ts'
import { LibrarySection } from './LibrarySection.tsx'
import { PublishSection } from './PublishSection.tsx'
import type { StatusTone } from './StatusBanner.tsx'

import './app.css'

export function App() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [libraryStatus, setLibraryStatus] = useState<{
    message: string
    tone: StatusTone
  } | null>(null)
  const libraryRef = useRef<HTMLElement>(null)

  const knownPaths = useMemo(() => new Set(pages.map(page => page.path)), [pages])

  const reload = useCallback(async () => {
    const next = await listPages()
    setPages(next)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        await reload()
      } catch (error: unknown) {
        setLibraryStatus({
          message: error instanceof Error ? error.message : '加载列表失败',
          tone: 'error'
        })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [reload])

  useEffect(() => {
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined
    if (libraryStatus?.tone === 'success' || libraryStatus?.tone === 'info') {
      timer = globalThis.setTimeout(() => {
        setLibraryStatus(null)
      }, 3600)
    }
    return () => {
      if (timer !== undefined) {
        globalThis.clearTimeout(timer)
      }
    }
  }, [libraryStatus])

  function onLibraryMessage(message: string, tone: StatusTone = 'info') {
    setLibraryStatus({ message, tone })
  }

  return (
    <main className='app'>
      <header className='app-header'>
        <Heading as='h1'>HTML Bucket</Heading>
        <Text as='p' className='app-tagline'>
          上传一份 HTML，马上得到可分享的内网链接——替代邮件来回传附件。
        </Text>
        <ul className='app-meta' aria-label='产品说明'>
          <li>内网开放 · 无需登录</li>
          <li>单文件 ≤ 1MB</li>
          <li>路径可覆盖 · 无历史版本</li>
        </ul>
      </header>

      <PublishSection
        knownPaths={knownPaths}
        onPublished={async () => {
          setFilter('')
          await reload()
          libraryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        onLibraryMessage={onLibraryMessage}
      />

      {loading ? (
        <section className='panel panel-loading' aria-busy='true' aria-live='polite'>
          <Stack direction='horizontal' gap='condensed' align='center'>
            <Spinner size='small' />
            <Text>正在加载页面库…</Text>
          </Stack>
        </section>
      ) : (
        <LibrarySection
          ref={libraryRef}
          pages={pages}
          filter={filter}
          onFilterChange={setFilter}
          onReload={reload}
          status={libraryStatus}
          onStatus={onLibraryMessage}
        />
      )}
    </main>
  )
}
