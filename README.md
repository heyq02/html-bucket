# HTML Bucket

Internal service for sharing static HTML: upload a file, set a relative path, get a durable intranet URL. Replaces emailing HTML attachments for reviews and demos.

**Trust model (v1):** anyone who can reach the service on the intranet may publish, overwrite, enable/disable, or delete pages. No login. Do not expose to the public internet.

## Quick start

```bash
npm install
npm run start:dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
# production build
npm run build
npm run start:prod
```

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listen port |
| `PAGE_STORE_ROOT` | `./storage` | Directory for stored HTML files and metadata |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Base URL returned in publish responses (set to the real internal host in deploy) |
| `MAX_FILE_SIZE_BYTES` | `1048576` (1MB) | Max upload size for a single HTML file |

## Docker

```bash
docker build -f docker/Dockerfile -t html-bucket .
docker run --rm -p 3000:3000 \
  -e PUBLIC_BASE_URL=http://html-bucket.internal:3000 \
  -e PAGE_STORE_ROOT=/home/storage \
  -v html-bucket-data:/home/storage \
  html-bucket
```

Always set `PUBLIC_BASE_URL` to the URL teammates will actually open. The image defaults to `http://localhost:3000`, which is wrong behind an internal hostname or reverse proxy.

Health probe: `GET /health` → `{ "status": "ok" }`.

## Limits (v1)

- Single `.html` / `text/html` file per path (no zip or asset folders)
- Max file size: 1MB (override with `MAX_FILE_SIZE_BYTES`)
- Path characters: letters, digits, `.`, `_`, `-`, `/`; no `..`
- Overwrite requires confirmation; no version history
- Disabled pages stay listed but return 404 when opened

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/` | Publish / library UI |
| `POST` | `/api/pages` | Publish (`multipart`: `file`, `path`, optional `overwrite=true`) |
| `GET` | `/api/pages?q=` | List pages (optional path filter) |
| `PATCH` | `/api/pages` | Enable / disable (`{ "path", "enabled" }`) |
| `DELETE` | `/api/pages?path=` | Hard delete |
| `GET` | `/:path` | Serve published HTML |

## Docs

- Demand: [`docs/DEMAND.md`](docs/DEMAND.md)
- PRD: [`docs/PRD.md`](docs/PRD.md)

## License

See [LICENSE](LICENSE).
