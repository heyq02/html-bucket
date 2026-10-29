import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PAGE_STORE_ROOT, PUBLIC_BASE_URL } from '../src/pages/pages.constants';

describe('Pages (e2e)', () => {
  let app: INestApplication;
  let storageDir: string;

  beforeEach(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'html-bucket-e2e-'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAGE_STORE_ROOT)
      .useValue(storageDir)
      .overrideProvider(PUBLIC_BASE_URL)
      .useValue('http://localhost:3000')
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  it('publishes HTML and returns a shareable URL that serves the page', async () => {
    const html = '<!doctype html><title>Demo</title><h1>Demo</h1>';

    const publish = await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'demos/checkout-v2')
      .attach('file', Buffer.from(html, 'utf8'), {
        filename: 'demo.html',
        contentType: 'text/html',
      })
      .expect(201);

    expect(publish.body).toEqual({
      path: 'demos/checkout-v2',
      url: 'http://localhost:3000/demos/checkout-v2',
    });

    const page = await request(app.getHttpServer())
      .get('/demos/checkout-v2')
      .expect(200);

    expect(page.headers['content-type']).toMatch(/text\/html/);
    expect(page.text).toBe(html);
  });

  it('lists and filters published pages', async () => {
    const html = '<h1>x</h1>';

    await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'demos/a')
      .attach('file', Buffer.from(html), {
        filename: 'a.html',
        contentType: 'text/html',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'reports/b')
      .attach('file', Buffer.from(html), {
        filename: 'b.html',
        contentType: 'text/html',
      })
      .expect(201);

    const all = await request(app.getHttpServer()).get('/api/pages').expect(200);
    expect(all.body.map((page: { path: string }) => page.path)).toEqual([
      'demos/a',
      'reports/b',
    ]);

    const filtered = await request(app.getHttpServer())
      .get('/api/pages')
      .query({ q: 'reports' })
      .expect(200);
    expect(filtered.body.map((page: { path: string }) => page.path)).toEqual([
      'reports/b',
    ]);
  });

  it('rejects publish without path', async () => {
    await request(app.getHttpServer())
      .post('/api/pages')
      .attach('file', Buffer.from('<h1>x</h1>'), {
        filename: 'x.html',
        contentType: 'text/html',
      })
      .expect(400);
  });

  it('rejects republish to the same path unless overwrite is selected', async () => {
    const first = '<h1>v1</h1>';
    const second = '<h1>v2</h1>';

    await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'demos/same')
      .attach('file', Buffer.from(first), {
        filename: 'a.html',
        contentType: 'text/html',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'demos/same')
      .attach('file', Buffer.from(second), {
        filename: 'b.html',
        contentType: 'text/html',
      })
      .expect(409);

    await request(app.getHttpServer())
      .get('/demos/same')
      .expect(200)
      .expect(first);

    await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'demos/same')
      .field('overwrite', 'true')
      .attach('file', Buffer.from(second), {
        filename: 'b.html',
        contentType: 'text/html',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/demos/same')
      .expect(200)
      .expect(second);
  });

  it('returns 404 for missing pages', async () => {
    await request(app.getHttpServer()).get('/missing/page').expect(404);
  });

  it('serves a publish UI at the root', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);

    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('HTML Bucket');
    expect(res.text).toContain('type="file"');
    expect(res.text).toContain('name="path"');
    expect(res.text).toContain('name="overwrite"');
    expect(res.text).toContain('data-action="toggle"');
    expect(res.text).toContain('data-action="update"');
    expect(res.text).toContain('data-action="delete"');
  });

  it('can disable, enable, and delete a published page', async () => {
    const html = '<h1>toggle-me</h1>';

    await request(app.getHttpServer())
      .post('/api/pages')
      .field('path', 'demos/ops')
      .attach('file', Buffer.from(html), {
        filename: 'ops.html',
        contentType: 'text/html',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/pages')
      .send({ path: 'demos/ops', enabled: false })
      .expect(200)
      .expect({ path: 'demos/ops', enabled: false });

    await request(app.getHttpServer()).get('/demos/ops').expect(404);

    const listedOff = await request(app.getHttpServer())
      .get('/api/pages')
      .expect(200);
    expect(listedOff.body).toEqual([
      expect.objectContaining({ path: 'demos/ops', enabled: false }),
    ]);

    await request(app.getHttpServer())
      .patch('/api/pages')
      .send({ path: 'demos/ops', enabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .get('/demos/ops')
      .expect(200)
      .expect(html);

    await request(app.getHttpServer())
      .delete('/api/pages')
      .query({ path: 'demos/ops' })
      .expect(200)
      .expect({ path: 'demos/ops', deleted: true });

    await request(app.getHttpServer()).get('/demos/ops').expect(404);
    await request(app.getHttpServer()).get('/api/pages').expect(200).expect([]);
  });
});
