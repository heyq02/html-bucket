import { access, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'

export interface PageSummary {
  path: string
  size: number
  updatedAt: Date
  enabled: boolean
}

export interface SaveOptions {
  overwrite?: boolean
}

interface PageMeta {
  enabled: boolean
}

type MetaFile = Record<string, PageMeta | undefined>

const META_FILE = '.pages-meta.json'

export class PageStore {
  constructor(private readonly rootDir: string) {}

  async save(relativePath: string, html: string, options: SaveOptions = {}): Promise<void> {
    const { overwrite = false } = options
    const safePath = this.assertSafePath(relativePath)
    const filePath = this.resolve(safePath)
    const alreadyExists = await this.exists(safePath)

    if (!overwrite && alreadyExists) {
      throw new Error('Path already exists')
    }

    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, html, 'utf8')

    const meta = await this.readMeta()
    if (!alreadyExists || meta[safePath] === undefined) {
      meta[safePath] = { enabled: true }
      await this.writeMeta(meta)
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await access(this.resolve(this.assertSafePath(relativePath)))
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false
      }
      throw error
    }
  }

  async get(relativePath: string): Promise<string | null> {
    try {
      const html = await readFile(this.resolve(this.assertSafePath(relativePath)), 'utf8')
      return html
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  async isEnabled(relativePath: string): Promise<boolean> {
    const safePath = this.assertSafePath(relativePath)
    if (!(await this.exists(safePath))) {
      return false
    }
    const meta = await this.readMeta()
    return meta[safePath]?.enabled ?? true
  }

  async setEnabled(relativePath: string, enabled: boolean): Promise<void> {
    const safePath = this.assertSafePath(relativePath)
    if (!(await this.exists(safePath))) {
      throw new Error('Page not found')
    }
    const meta = await this.readMeta()
    meta[safePath] = { enabled }
    await this.writeMeta(meta)
  }

  async remove(relativePath: string): Promise<void> {
    const safePath = this.assertSafePath(relativePath)
    const filePath = this.resolve(safePath)
    try {
      await rm(filePath, { force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }

    const meta = await this.readMeta()
    if (meta[safePath] !== undefined) {
      delete meta[safePath]
      await this.writeMeta(meta)
    }
  }

  async list(filter?: string): Promise<PageSummary[]> {
    const files = await this.collectHtmlFiles(this.rootDir)
    const meta = await this.readMeta()
    const pages: PageSummary[] = []

    for (const filePath of files) {
      const path = this.toRelativePath(filePath)
      if (filter && !path.includes(filter)) {
        continue
      }
      const info = await stat(filePath)
      pages.push({
        path,
        size: info.size,
        updatedAt: info.mtime,
        enabled: meta[path]?.enabled ?? true
      })
    }

    return pages.toSorted((a, b) => a.path.localeCompare(b.path))
  }

  private async readMeta(): Promise<MetaFile> {
    try {
      const raw = await readFile(join(this.rootDir, META_FILE), 'utf8')
      return JSON.parse(raw) as MetaFile
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {}
      }
      throw error
    }
  }

  private async writeMeta(meta: MetaFile): Promise<void> {
    await mkdir(this.rootDir, { recursive: true })
    await writeFile(join(this.rootDir, META_FILE), JSON.stringify(meta, null, 2), 'utf8')
  }

  private async collectHtmlFiles(dir: string): Promise<string[]> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }

    const files: string[] = []
    for (const entry of entries) {
      if (entry.name === META_FILE) {
        continue
      }
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await this.collectHtmlFiles(fullPath)))
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(fullPath)
      }
    }
    return files
  }

  private toRelativePath(filePath: string): string {
    const rel = relative(this.rootDir, filePath).replace(/\.html$/, '')
    return rel.split(sep).join('/')
  }

  private assertSafePath(relativePath: string): string {
    const normalized = relativePath.trim().replace(/^\/+/, '').replaceAll('\\', '/')
    if (!normalized) {
      throw new Error('Invalid path: path is required')
    }
    const segments = normalized.split('/')
    if (segments.some(segment => !segment || segment === '.' || segment === '..')) {
      throw new Error('Invalid path: path traversal is not allowed')
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) {
      throw new Error('Invalid path: contains unsupported characters')
    }
    return normalized
  }

  private resolve(relativePath: string): string {
    return join(this.rootDir, `${relativePath}.html`)
  }
}
