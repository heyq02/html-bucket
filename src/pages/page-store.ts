import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';

export type PageSummary = {
  path: string;
  size: number;
  updatedAt: Date;
};

export class PageStore {
  constructor(private readonly rootDir: string) {}

  async save(relativePath: string, html: string): Promise<void> {
    const filePath = this.resolve(this.assertSafePath(relativePath));
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, html, 'utf8');
  }

  async get(relativePath: string): Promise<string | null> {
    try {
      return await readFile(
        this.resolve(this.assertSafePath(relativePath)),
        'utf8',
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async list(filter?: string): Promise<PageSummary[]> {
    const files = await this.collectHtmlFiles(this.rootDir);
    const pages: PageSummary[] = [];

    for (const filePath of files) {
      const path = this.toRelativePath(filePath);
      if (filter && !path.includes(filter)) {
        continue;
      }
      const info = await stat(filePath);
      pages.push({
        path,
        size: info.size,
        updatedAt: info.mtime,
      });
    }

    return pages.sort((a, b) => a.path.localeCompare(b.path));
  }

  private async collectHtmlFiles(dir: string): Promise<string[]> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.collectHtmlFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  private toRelativePath(filePath: string): string {
    const rel = relative(this.rootDir, filePath).replace(/\.html$/, '');
    return rel.split(sep).join('/');
  }

  private assertSafePath(relativePath: string): string {
    const normalized = relativePath.trim().replace(/^\/+/, '').replace(/\\/g, '/');
    if (!normalized) {
      throw new Error('Invalid path: path is required');
    }
    const segments = normalized.split('/');
    if (
      segments.some(
        (segment) => !segment || segment === '.' || segment === '..',
      )
    ) {
      throw new Error('Invalid path: path traversal is not allowed');
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) {
      throw new Error('Invalid path: contains unsupported characters');
    }
    return normalized;
  }

  private resolve(relativePath: string): string {
    return join(this.rootDir, `${relativePath}.html`);
  }
}
