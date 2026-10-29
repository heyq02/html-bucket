import { Button, Dialog, FormControl, Heading, Link, Stack, Text, TextInput } from '@primer/react'
import { useId, useRef, useState } from 'react'

import { copyText, defaultPathFromFilename, messageFromBody, pageUrl, publishPage } from './api.ts'
import { StatusBanner } from './StatusBanner.tsx'
import type { StatusTone } from './StatusBanner.tsx'

interface PublishSectionProps {
  knownPaths: Set<string>
  onPublished: () => Promise<void>
  onLibraryMessage: (message: string, tone?: StatusTone) => void
}

export function PublishSection({ knownPaths, onPublished, onLibraryMessage }: PublishSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pathInputId = useId()
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [path, setPath] = useState('')
  const [result, setResult] = useState<{ message: string; tone: StatusTone; path?: string } | null>(
    null
  )
  const [overwritePath, setOverwritePath] = useState<string | null>(null)
  const overwriteResolver = useRef<((value: boolean) => void) | null>(null)
  const [publishing, setPublishing] = useState(false)

  function askOverwrite(targetPath: string): Promise<boolean> {
    return new Promise(resolve => {
      overwriteResolver.current = resolve
      setOverwritePath(targetPath)
    })
  }

  function closeOverwrite(answer: boolean) {
    setOverwritePath(null)
    overwriteResolver.current?.(answer)
    overwriteResolver.current = null
  }

  function showPickStep() {
    setPendingFile(null)
    setPath('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function onFileChosen(file: File | undefined) {
    if (!file) {
      return
    }
    setResult(null)
    setPendingFile(file)
    setPath(defaultPathFromFilename(file.name))
  }

  async function handlePublish(event: { preventDefault: () => void }) {
    event.preventDefault()
    if (!pendingFile) {
      setResult({ message: '请先选择 HTML 文件', tone: 'error' })
      showPickStep()
      return
    }

    const trimmed = path.trim()
    if (!trimmed) {
      setResult({ message: '请填写相对路径', tone: 'error' })
      return
    }

    const overwrite = knownPaths.has(trimmed)
    if (overwrite) {
      const shouldOverwrite = await askOverwrite(trimmed)
      if (!shouldOverwrite) {
        setResult({ message: '已取消发布，路径未被覆盖', tone: 'info' })
        return
      }
    }

    setPublishing(true)
    setResult({ message: '发布中…', tone: 'info' })

    try {
      let response = await publishPage(pendingFile, trimmed, overwrite)

      if (response.status === 409) {
        const shouldOverwrite = await askOverwrite(trimmed)
        if (!shouldOverwrite) {
          setResult({ message: '已取消发布，路径未被覆盖', tone: 'info' })
          return
        }
        response = await publishPage(pendingFile, trimmed, true)
      }

      if (!response.ok) {
        setResult({
          message: messageFromBody(response.body, '发布失败'),
          tone: 'error'
        })
        return
      }

      showPickStep()
      await onPublished()
      setResult({ message: `已发布：/${trimmed}`, tone: 'success', path: trimmed })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className='panel' aria-labelledby='publish-title'>
      <Heading as='h2' id='publish-title'>
        发布
      </Heading>

      <input
        ref={fileInputRef}
        type='file'
        accept='.html,text/html'
        hidden
        onChange={event => {
          onFileChosen(event.target.files?.[0])
        }}
      />

      {pendingFile ? (
        <form onSubmit={handlePublish}>
          <Stack gap='normal'>
            <Text>
              已选择：
              <Text as='span'>{pendingFile.name}</Text>
            </Text>

            <FormControl required>
              <FormControl.Label>相对路径</FormControl.Label>
              <TextInput
                id={pathInputId}
                name='path'
                value={path}
                onChange={event => {
                  setPath(event.target.value)
                }}
                placeholder='demos/checkout-v2'
                block
              />
              <FormControl.Caption>默认使用文件名，可修改。</FormControl.Caption>
            </FormControl>

            <Stack direction='horizontal' gap='condensed'>
              <Button type='submit' variant='primary' disabled={publishing}>
                确认发布
              </Button>
              <Button
                type='button'
                onClick={() => {
                  setResult(null)
                  fileInputRef.current?.click()
                }}
              >
                重新选择
              </Button>
            </Stack>
          </Stack>
        </form>
      ) : (
        <Stack gap='condensed'>
          <div>
            <Button variant='primary' onClick={() => fileInputRef.current?.click()}>
              上传 HTML
            </Button>
          </div>
          <Text>点击后选择要发布的 HTML 文件（最大 1MB）。</Text>
        </Stack>
      )}

      {result ? (
        result.path && result.tone === 'success' ? (
          <div className='publish-success'>
            <span>
              已发布：
              <Link href={`/${result.path}`}>/{result.path}</Link>
            </span>
            <Button
              size='small'
              onClick={async () => {
                try {
                  const url = pageUrl(result.path!)
                  await copyText(url)
                  onLibraryMessage(`已复制 ${url}`, 'success')
                } catch {
                  onLibraryMessage('复制失败，请手动复制地址栏链接', 'error')
                }
              }}
            >
              复制链接
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: '0.75rem' }}>
            <StatusBanner message={result.message} tone={result.tone} />
          </div>
        )
      ) : null}

      {overwritePath ? (
        <Dialog
          title='确认覆盖'
          onClose={() => {
            closeOverwrite(false)
          }}
          footerButtons={[
            {
              content: '取消',
              onClick: () => {
                closeOverwrite(false)
              }
            },
            {
              content: '覆盖',
              buttonType: 'danger',
              onClick: () => {
                closeOverwrite(true)
              }
            }
          ]}
        >
          <Text>
            路径 <Text as='span'>/{overwritePath}</Text> 已存在，是否覆盖？
          </Text>
        </Dialog>
      ) : null}
    </section>
  )
}
