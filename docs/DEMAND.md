# HTML Bucket

## 1. Summary

HTML Bucket is an internal Node service that lets the team upload an HTML file, assign a relative path, and get a shareable link on the company network. It replaces emailing HTML attachments for review and demos.

## 2. Background

Today, sharing a static HTML page means attaching it to email (or chat). Recipients download, open locally, and lose a stable URL for follow-up. Links break across machines; assets and paths often misbehave offline.

We need a lightweight place on the internal network: upload once, link forever (for that path), browse what already exists.

## 3. Objective

Make internal HTML sharing as fast as “upload → copy link,” with no CDN or CI involved.

**Key Results**
- A teammate can publish a reviewable HTML page and share a working internal URL in under 1 minute.
- New shares use a link instead of an email HTML attachment (team habit for demos/reviews).

## 4. Market Segment(s)

**Internal makers who need to show HTML** — engineers, PMs, designers who produce a single-page or static HTML demo and need teammates to open it without installing anything.

Constraints: internal network only; not for public internet; trust model is “anyone who can reach the service on the intranet.”

## 5. Value Proposition

- **Who:** Internal makers sharing HTML for review or demo  
- **Why:** Get a page in front of teammates quickly, with a URL that stays usable  
- **What before:** Email/chat the `.html` file; others download and open locally; no durable link  
- **How:** Upload HTML, set a relative path, get an internal page URL; browse/filter existing pages; update, disable, or delete as needed  
- **What after:** One link in chat/email; anyone on the network opens the live page  
- **Alternatives:** Email attachments, ad-hoc static hosts, full deploy pipelines — those are slower or heavier for a one-off HTML file  

**Statement:** For teammates who need to share HTML demos, HTML Bucket turns “email a file” into “paste an internal URL” in under a minute.

## 6. Solution

### 6.1 Key flow

1. Open the service UI (internal).  
2. Upload an HTML file and enter a relative path.  
3. Get a page URL; copy and share.  
4. Use the lower list to find, filter, open, update, enable/disable, or delete existing pages.

### 6.2 Key features (v1)

- Upload a single HTML file (max 1MB) and bind it to a relative path  
- Return a stable internal URL for that path; one-click copy  
- Overwrite same path after confirmation; update from the list  
- Enable / disable and hard delete  
- Page list with filter/search (path, status, size, updated time)  
- Serve uploaded HTML over HTTP on the internal network  
- Health check for deploy probes  

### 6.3 Technology

Node service, deployed on the internal network. See README for stack and env vars.

### 6.4 Decisions

- **Auth:** Intranet open — no login for v1.  
- **Path ownership:** Anyone who can reach the service may overwrite, disable, or delete any path (confirm before overwrite).  
- **Max file size:** 1MB; HTML only (no zip / asset folders in v1).  
- **Assumption:** One HTML file per path is enough for v1; no version history.  

## 7. Release

| In v1 | Later | Not doing |
| --- | --- | --- |
| Upload HTML + relative path → URL | Multi-file / asset folders | Public internet hosting |
| Internal HTTP serve | Auth / permissions if needed | Full CMS or visual editor |
| List + filter; update / enable / delete | Version history, preview diffs | CI/CD or CDN replacement |
| Overwrite confirm; copy link; health | Quotas, path ownership | |

**Timeframe:** Small internal tool — usable v1 in days once host and `PUBLIC_BASE_URL` are set.

Full product detail: `docs/PRD.md`.
