import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageStore, PageSummary } from './page-store';
import { PAGE_STORE_ROOT, PUBLIC_BASE_URL } from './pages.constants';

@Injectable()
export class PagesService {
  private readonly store: PageStore;

  constructor(
    @Inject(PAGE_STORE_ROOT) rootDir: string,
    @Inject(PUBLIC_BASE_URL) private readonly publicBaseUrl: string,
  ) {
    this.store = new PageStore(rootDir);
  }

  async publish(
    path: string,
    html: string,
    overwrite = false,
  ): Promise<{ path: string; url: string }> {
    try {
      await this.store.save(path, html, { overwrite });
    } catch (error) {
      const message = (error as Error).message;
      if (/already exists/i.test(message)) {
        throw new ConflictException(message);
      }
      throw new BadRequestException(message);
    }

    return {
      path,
      url: this.toUrl(path),
    };
  }

  async getHtml(path: string): Promise<string> {
    let html: string | null;
    try {
      html = await this.store.get(path);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    if (html === null) {
      throw new NotFoundException(`Page not found: ${path}`);
    }

    const enabled = await this.store.isEnabled(path);
    if (!enabled) {
      throw new NotFoundException(`Page not found: ${path}`);
    }

    return html;
  }

  async list(filter?: string): Promise<PageSummary[]> {
    return this.store.list(filter);
  }

  async setEnabled(
    path: string,
    enabled: boolean,
  ): Promise<{ path: string; enabled: boolean }> {
    try {
      await this.store.setEnabled(path, enabled);
    } catch (error) {
      const message = (error as Error).message;
      if (/not found/i.test(message)) {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
    return { path, enabled };
  }

  async remove(path: string): Promise<{ path: string; deleted: true }> {
    try {
      if (!(await this.store.exists(path))) {
        throw new NotFoundException(`Page not found: ${path}`);
      }
      await this.store.remove(path);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException((error as Error).message);
    }
    return { path, deleted: true };
  }

  private toUrl(path: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${path}`;
  }
}
