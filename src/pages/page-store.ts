import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export class PageStore {
  constructor(private readonly rootDir: string) {}

  async save(relativePath: string, html: string): Promise<void> {
    const filePath = this.resolve(relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, html, 'utf8');
  }

  async get(relativePath: string): Promise<string | null> {
    try {
      return await readFile(this.resolve(relativePath), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private resolve(relativePath: string): string {
    return join(this.rootDir, `${relativePath}.html`);
  }
}
