import { Heading, Text } from '@primer/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { listPages } from './api.ts'
import type { PageSummary } from './api.ts'
import { LibrarySection } from './LibrarySection.tsx'
import { PublishSection } from './PublishSection.tsx'
import type { StatusTone } from './StatusBanner.tsx'

import './app.css'

export function App() {
  const [pages, setPages] = useState<PageSummary[]>([])
  const [filter, setFilter] = useState('')
  const [libraryStatus, setLibraryStatus] = useState<{
    message: string
    tone: StatusTone
  } | null>(null)

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
      }
    }
    void load()
  }, [reload])

  useEffect(() => {
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined
    if (libraryStatus?.tone === 'success') {
      timer = globalThis.setTimeout(() => {
        setLibraryStatus(null)
      }, 3200)
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
        <Text as='p'>先选择 HTML 文件，再确认相对路径并发布。内网任意可达用户均可发布与管理。</Text>
      </header>

      <PublishSection
        knownPaths={knownPaths}
        onPublished={async () => {
          setFilter('')
          await reload()
        }}
        onLibraryMessage={onLibraryMessage}
      />

      <LibrarySection
        pages={pages}
        filter={filter}
        onFilterChange={setFilter}
        onReload={reload}
        status={libraryStatus}
        onStatus={onLibraryMessage}
      />
    </main>
  )
}
