# PRD: HTML Bucket

## 1. Summary

HTML Bucket is an internal Node service for teams who need to share static HTML quickly. A user uploads an HTML file, sets a relative path, and gets a stable URL on the company network. It replaces emailing HTML attachments for reviews and demos, so anyone on the intranet can open the same live page from one link.

## 2. Contacts

Not listed — this is an internal tooling initiative. Owner and reviewers can be added when the project is staffed.

## 3. Background

### Context

Teams often produce one-off HTML: prototypes, layout checks, report dumps, interactive demos, or design handoff pages. The job is not “ship a product.” The job is “let a few people see this page right now.”

Today that usually means attaching an `.html` file in email or chat. Recipients download it, open it in a browser, and lose any shared URL. Follow-up comments point at “the file I sent yesterday.” Relative assets and paths often break when opened from disk. There is no list of “what we already shared.”

### Why now

Internal networks already host small services easily. We do not need a public CDN or a full CI pipeline for a single HTML file. A small upload-and-serve tool is enough to change the habit from “send a file” to “send a link.”

### What this is not

HTML Bucket is not a CMS, a design tool, or a replacement for production hosting. It is a bucket for HTML pages the team wants to point at.

## 4. Objective

**Objective:** Make internal HTML sharing as fast as upload → copy link, with no CDN or CI required.

**Why it matters:** Faster review loops, fewer broken local opens, and one durable URL per path for chat and docs.

**Key Results (SMART)**

| KR                  | Measure                                                                      | Target                                                                                            |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| KR1 — Time to share | From opening the UI to a working internal URL in the clipboard / message     | ≤ 1 minute for a single HTML file                                                                 |
| KR2 — Habit shift   | New internal HTML demos/reviews shared as links instead of email attachments | Team default for new shares within 4 weeks of launch (track via lightweight survey or spot-check) |
| KR3 — Reliability   | Shared URL opens the intended page for any intranet user                     | ≥ 99% successful opens for published paths during normal network conditions                       |

## 5. Market Segment(s)

### Primary — Internal makers who need to show HTML

Engineers, PMs, and designers who produce a single-page or static HTML demo and need teammates to open it without installing tools or cloning a repo.

**Job:** Get this HTML in front of reviewers fast, with a URL that still works tomorrow.

**Constraints**

- Deployed and used only on the internal network
- Not for public internet traffic
- Trust model for v1: anyone who can reach the service on the intranet may publish, overwrite, enable/disable, or delete pages (no login)

### Secondary (later) — Frequent publishers of multi-file HTML packages

People who ship HTML plus CSS/JS/images as a small folder. Out of scope for v1 (single file only); keep as a later segment so the product roadmap stays honest.

## 6. Value Proposition(s)

### Primary segment — Internal makers

| Part             | Detail                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who**          | Internal makers sharing HTML for review or demo                                                                                                                                              |
| **Why**          | They need teammates to see a page quickly and keep a stable reference URL. Email attachments and local opens get in the way.                                                                 |
| **What before**  | Attach `.html` to email/chat → download → open from disk. No durable link. Paths/assets often break. Hard to find “what we shared last week.”                                                |
| **How**          | Upload HTML, bind a relative path, get an internal URL; browse and filter published pages in a list; update, disable, or delete as needed; service serves the file over HTTP on the intranet |
| **What after**   | Paste one link in chat/email/docs. Anyone on the network opens the live page. Same path stays usable for follow-up.                                                                          |
| **Alternatives** | Email/chat attachments (fast start, bad URL); ad-hoc personal static hosts (inconsistent); full deploy / CI to staging (heavy for a one-off)                                                 |

**Value proposition statement:** For teammates who need to share HTML demos, HTML Bucket turns “email a file” into “paste an internal URL” in under a minute — without a deploy pipeline.

### Value curve vs alternatives (qualitative)

| Dimension                      | Email attachment  | Full CI / staging deploy | HTML Bucket (v1)                   |
| ------------------------------ | ----------------- | ------------------------ | ---------------------------------- |
| Speed to first share           | High              | Low                      | High                               |
| Stable shareable URL           | Low               | High                     | High                               |
| Setup / ops cost               | None              | High                     | Low                                |
| Multi-file / assets            | Medium (zip pain) | High                     | Low (v1: single file)              |
| Discoverability of past shares | Low               | Medium                   | High (list + filter)               |
| Public reach                   | N/A (local)       | Possible                 | None (intranet only) — intentional |

## 7. Solution

### 7.1 UX / key flows

**Layout**

1. **Publish:** upload control + relative path input → result URL (copy).
2. **Library:** list of published pages with filter/search; open, copy link, update, enable/disable, or delete.

**Happy path — Publish**

1. User opens the service on the internal network.
2. Selects one `.html` file.
3. Enters a relative path (e.g. `demos/checkout-v2`).
4. Submits; if the path already exists, UI asks for overwrite confirmation.
5. UI shows the full internal URL; user copies and shares.

**Happy path — Browse / manage**

1. User opens the same UI.
2. Filters or searches the list (by path).
3. Opens a listed page, copies its link, updates the HTML, toggles enabled, or deletes it.

**Edge cases to handle in UI**

- Empty path → clear validation error
- Invalid path characters → reject with message
- Non-HTML upload → reject (v1: HTML only)
- File over max size → reject with clear message
- Same path overwrite → confirm before replace
- Upload failure / disk error → actionable error, no silent success

### 7.2 Key features (v1 must-haves)

| Feature                | Behavior                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| HTML upload            | Accept a single `.html` (or `text/html`) file, max 1MB                                                          |
| Relative path binding  | User-defined path maps 1:1 to the stored page                                                                   |
| Stable URL             | `https://<internal-host>/<relative-path>` (exact URL scheme set at deploy via `PUBLIC_BASE_URL`) opens the page |
| Overwrite with confirm | Re-upload to the same path replaces content after UI confirmation; no version history                           |
| Update from library    | Replace HTML for an existing path without changing the path                                                     |
| Enable / disable       | Disabled pages stay in the list but return 404 when opened                                                      |
| Delete                 | Hard-delete removes the file and list entry                                                                     |
| Page list              | Show path, status, size, updated time                                                                           |
| Filter / search        | Filter list by path substring                                                                                   |
| Copy link              | One-click copy of the shareable URL after publish and from the list                                             |
| Internal HTTP serve    | Serve stored HTML with correct content type to intranet clients                                                 |
| Health check           | `GET /health` for deploy probes                                                                                 |

### 7.3 Technology

- **Runtime:** Node (NestJS) service
- **Deploy:** Internal network only (Docker image provided)
- **Storage:** Local or mounted disk (`PAGE_STORE_ROOT`)
- **UI:** Simple web UI served by the same service

Out of scope for tech in this PRD: SSO, CDN, multi-region, object storage.

### 7.4 Decisions and remaining open items

**Decided for v1**

| Topic          | Decision                                                         |
| -------------- | ---------------------------------------------------------------- |
| Auth           | Intranet reachability only; no login                             |
| Path ownership | Anyone on the network may overwrite, disable, or delete any path |
| Max file size  | 1MB per HTML file                                                |
| Format         | HTML only (no zip / asset folders)                               |
| Path rules     | Letters, digits, `.`, `_`, `-`, `/`; no `..` or empty segments   |
| Remove / hide  | Hard delete + enable/disable toggle (no soft-delete recycle bin) |

**Assumptions**

1. One HTML file per path is enough for the first useful version.
2. Success is “link in under a minute,” not feature parity with Netlify/GitHub Pages.

**Deferred (later versions)**

- Multi-file / zip with assets
- Auth / permissions / path ownership
- Version history

## 8. Release

### v1 (now)

- Upload single HTML + relative path → internal URL (copy)
- Serve page over HTTP on the intranet
- List + filter/search + updated time
- Overwrite with confirmation; update / enable / disable / delete from library
- Health check; env-based deploy config

### Later

- Multi-file / asset folders or zip upload
- Auth / permissions if intranet-open is not enough
- Version history or “previous revision”
- Quotas, path ownership

### Explicitly not doing

- Public internet hosting
- Full CMS or visual HTML editor
- Replacing CI/CD or production CDN
- Collaboration features (comments, roles) in v1

### Launch notes

- Ship to a small pilot group first; confirm KR1 in real use
- Document the base URL and path conventions (see README)
- Revisit auth / ownership after first week if conflicts or access concerns appear

---

_Source demand: `docs/DEMAND.md`. v1 access and lifecycle decisions are locked above._
