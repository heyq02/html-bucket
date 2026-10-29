import {
  BadRequestException,
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

  async publish(path: string, html: string): Promise<{ path: string; url: string }> {
    try {
      await this.store.save(path, html);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
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

    return html;
  }

  async list(filter?: string): Promise<PageSummary[]> {
    return this.store.list(filter);
  }

  private toUrl(path: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${path}`;
  }
}
