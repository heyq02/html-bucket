import {
  Button,
  Dialog,
  FormControl,
  Heading,
  Label,
  Link,
  LinkButton,
  Stack,
  Text,
  TextInput
} from '@primer/react'
import { useId, useRef, useState } from 'react'

import {
  copyText,
  defaultPathFromFilename,
  formatBytes,
  MAX_UPLOAD_BYTES,
  messageFromBody,
  pageUrl,
  publishPage,
  validateHtmlUpload
} from './api.ts'
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
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<{ message: string; tone: StatusTone; path?: string } | null>(
    null
  )
  const [overwritePath, setOverwritePath] = useState<string | null>(null)
  const overwriteResolver = useRef<((value: boolean) => void) | null>(null)
  const [publishing, setPublishing] = useState(false)

  const trimmedPath = path.trim()
  const pathExists = trimmedPath.length > 0 && knownPaths.has(trimmedPath)
  const previewUrl = trimmedPath ? pageUrl(trimmedPath) : ''

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
    const error = validateHtmlUpload(file)
    if (error) {
      setResult({ message: error, tone: 'error' })
      showPickStep()
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

    if (!trimmedPath) {
      setResult({ message: '请填写相对路径', tone: 'error' })
      return
    }

    const overwrite = knownPaths.has(trimmedPath)
    if (overwrite) {
      const shouldOverwrite = await askOverwrite(trimmedPath)
      if (!shouldOverwrite) {
        setResult({ message: '已取消发布，路径未被覆盖', tone: 'info' })
        return
      }
    }

    setPublishing(true)
    setResult({ message: '发布中…', tone: 'info' })

    try {
      let response = await publishPage(pendingFile, trimmedPath, overwrite)

      if (response.status === 409) {
        const shouldOverwrite = await askOverwrite(trimmedPath)
        if (!shouldOverwrite) {
          setResult({ message: '已取消发布，路径未被覆盖', tone: 'info' })
          return
        }
        response = await publishPage(pendingFile, trimmedPath, true)
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
      setResult({ message: `已发布：/${trimmedPath}`, tone: 'success', path: trimmedPath })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <section className='panel' aria-labelledby='publish-title'>
      <header className='panel-head'>
        <Heading as='h2' id='publish-title'>
          发布
        </Heading>
        <Text as='p' className='panel-desc'>
          选文件 → 确认路径 → 复制链接发给同事。
        </Text>
      </header>

      <input
        ref={fileInputRef}
        type='file'
        accept='.html,.htm,text/html'
        hidden
        onChange={event => {
          onFileChosen(event.target.files?.[0])
        }}
      />

      {pendingFile ? (
        <form onSubmit={handlePublish}>
          <Stack gap='normal'>
            <div className='file-chip'>
              <div className='file-chip-main'>
                <Text weight='medium'>{pendingFile.name}</Text>
                <Text className='muted-inline'>{formatBytes(pendingFile.size)}</Text>
              </div>
              <Button
                type='button'
                size='small'
                disabled={publishing}
                onClick={() => {
                  setResult(null)
                  fileInputRef.current?.click()
                }}
              >
                更换文件
              </Button>
            </div>

            <FormControl required>
              <FormControl.Label htmlFor={pathInputId}>相对路径</FormControl.Label>
              <TextInput
                id={pathInputId}
                name='path'
                value={path}
                onChange={event => {
                  setPath(event.target.value)
                }}
                placeholder='demos/checkout-v2'
                block
                autoComplete='off'
                spellCheck={false}
              />
              <FormControl.Caption>
                字母、数字、. _ - /；勿含 <Text as='span'>..</Text>。默认取自文件名。
              </FormControl.Caption>
            </FormControl>

            {trimmedPath ? (
              <div className='url-preview' aria-live='polite'>
                <Text size='small' className='url-preview-label'>
                  发布后地址
                </Text>
                <Text as='p' className='url-preview-value'>
                  {previewUrl}
                </Text>
                {pathExists ? (
                  <Label variant='attention' size='small'>
                    路径已存在，确认后将覆盖
                  </Label>
                ) : null}
              </div>
            ) : null}

            <Stack direction='horizontal' gap='condensed'>
              <Button type='submit' variant='primary' disabled={publishing || !trimmedPath}>
                {publishing ? '发布中…' : pathExists ? '覆盖发布' : '确认发布'}
              </Button>
              <Button
                type='button'
                disabled={publishing}
                onClick={() => {
                  setResult(null)
                  showPickStep()
                }}
              >
                取消
              </Button>
            </Stack>
          </Stack>
        </form>
      ) : (
        <button
          type='button'
          className={dragging ? 'dropzone is-dragging' : 'dropzone'}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={event => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragOver={event => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={event => {
            event.preventDefault()
            setDragging(false)
          }}
          onDrop={event => {
            event.preventDefault()
            setDragging(false)
            onFileChosen(event.dataTransfer.files[0])
          }}
        >
          <Text weight='medium'>拖入 HTML，或点击选择</Text>
          <Text as='span' className='dropzone-hint'>
            仅 .html / .htm · 最大 {formatBytes(MAX_UPLOAD_BYTES)}
          </Text>
        </button>
      )}

      {result ? (
        result.path && result.tone === 'success' ? (
          <div className='publish-success' role='status'>
            <div className='publish-success-body'>
              <Text weight='medium'>发布成功</Text>
              <Link href={`/${result.path}`} target='_blank' rel='noreferrer'>
                {pageUrl(result.path)}
              </Link>
            </div>
            <Stack direction='horizontal' gap='condensed'>
              <Button
                size='small'
                variant='primary'
                onClick={async () => {
                  try {
                    const url = pageUrl(result.path!)
                    await copyText(url)
                    onLibraryMessage(`已复制链接`, 'success')
                  } catch {
                    onLibraryMessage('复制失败，请手动选中上方链接', 'error')
                  }
                }}
              >
                复制链接
              </Button>
              <LinkButton size='small' href={`/${result.path}`} target='_blank' rel='noreferrer'>
                打开页面
              </LinkButton>
            </Stack>
          </div>
        ) : (
          <div className='status-slot'>
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
              autoFocus: true,
              onClick: () => {
                closeOverwrite(true)
              }
            }
          ]}
        >
          <Text as='p'>
            路径{' '}
            <Text as='span' weight='medium'>
              /{overwritePath}
            </Text>{' '}
            已有页面。覆盖后旧内容不可恢复。
          </Text>
        </Dialog>
      ) : null}
    </section>
  )
}
