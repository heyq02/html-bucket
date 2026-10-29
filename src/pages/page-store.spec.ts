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

  it('overwrites HTML at the same path when overwrite is true', async () => {
    await store.save('demos/hello', '<h1>v1</h1>');
    await store.save('demos/hello', '<h1>v2</h1>', { overwrite: true });

    await expect(store.get('demos/hello')).resolves.toBe('<h1>v2</h1>');
  });

  it('rejects save when path exists and overwrite is false', async () => {
    await store.save('demos/hello', '<h1>v1</h1>');

    await expect(
      store.save('demos/hello', '<h1>v2</h1>', { overwrite: false }),
    ).rejects.toThrow(/exists/i);

    await expect(store.get('demos/hello')).resolves.toBe('<h1>v1</h1>');
  });

  it('returns null when path is missing', async () => {
    await expect(store.get('missing/page')).resolves.toBeNull();
  });

  it('lists published paths', async () => {
    await store.save('demos/a', '<h1>a</h1>');
    await store.save('demos/b', '<h1>b</h1>');

    const pages = await store.list();

    expect(pages.map((page) => page.path).sort()).toEqual([
      'demos/a',
      'demos/b',
    ]);
  });

  it('filters listed paths by substring', async () => {
    await store.save('demos/checkout', '<h1>c</h1>');
    await store.save('reports/weekly', '<h1>w</h1>');

    const pages = await store.list('checkout');

    expect(pages.map((page) => page.path)).toEqual(['demos/checkout']);
  });

  it('rejects empty path', async () => {
    await expect(store.save('', '<h1>x</h1>')).rejects.toThrow(/path/i);
  });

  it('rejects path traversal', async () => {
    await expect(store.save('../escape', '<h1>x</h1>')).rejects.toThrow(
      /path/i,
    );
  });
});
