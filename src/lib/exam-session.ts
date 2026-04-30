export const EXAM_DURATION_MINUTES = 20
export const EXAM_DURATION_MS = EXAM_DURATION_MINUTES * 60 * 1000

function getWindowLocalStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function startKey(examId: string) {
  return `exam_start_at:${examId}`
}

function submittedKey(examId: string) {
  return `exam_submitted:${examId}`
}

export function getExamStartAt(examId: string): number | null {
  const storage = getWindowLocalStorage()
  if (!storage) return null

  const raw = storage.getItem(startKey(examId))
  if (!raw) return null

  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function ensureExamStartAt(examId: string): number {
  const storage = getWindowLocalStorage()
  const existing = storage ? getExamStartAt(examId) : null
  if (existing) return existing

  const now = Date.now()
  storage?.setItem(startKey(examId), String(now))
  return now
}

export function clearExamSession(examId: string): void {
  const storage = getWindowLocalStorage()
  if (!storage) return

  storage.removeItem(startKey(examId))
  storage.removeItem(submittedKey(examId))
}

export function markExamSubmitted(examId: string): void {
  const storage = getWindowLocalStorage()
  if (!storage) return

  storage.setItem(submittedKey(examId), 'true')
  storage.removeItem(startKey(examId))
}

export function isExamSubmitted(examId: string): boolean {
  const storage = getWindowLocalStorage()
  if (!storage) return false

  return storage.getItem(submittedKey(examId)) === 'true'
}
