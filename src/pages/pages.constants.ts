export const PAGE_STORE_ROOT = 'PAGE_STORE_ROOT'
export const PUBLIC_BASE_URL = 'PUBLIC_BASE_URL'

export const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024

export function resolveMaxFileSizeBytes(): number {
  const raw = process.env.MAX_FILE_SIZE_BYTES
  if (!raw) {
    return DEFAULT_MAX_FILE_SIZE_BYTES
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_FILE_SIZE_BYTES
  }
  return Math.floor(parsed)
}
