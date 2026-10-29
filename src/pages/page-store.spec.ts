import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PageStore } from './page-store';

describe('PageStore', () => {
  let rootDir: string;
  let store: PageStore;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'html-bucket-'));
    store = new PageStore(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('saves HTML and makes it retrievable by path', async () => {
    const html = '<!doctype html><title>Hello</title><h1>Hello</h1>';

    await store.save('demos/hello', html);

    await expect(store.get('demos/hello')).resolves.toBe(html);
  });
});
