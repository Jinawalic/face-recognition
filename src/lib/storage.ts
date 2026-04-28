

const STUDENT_AUTH_KEY = 'student_auth'
const ADMIN_AUTH_KEY = 'admin_auth'

export function getStudentAuth(): AuthState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STUDENT_AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getAdminAuth(): AuthState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStudentAuth(auth: AuthState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STUDENT_AUTH_KEY, JSON.stringify(auth))
}

export function setAdminAuth(auth: AuthState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth))
}

export function clearStudentAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STUDENT_AUTH_KEY)
}

export function clearAdminAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ADMIN_AUTH_KEY)
}

// Backward compatibility (if needed)
export function getAuth(): AuthState | null { return getStudentAuth() }
export function setAuth(auth: AuthState): void { setStudentAuth(auth) }
export function clearAuth(): void { clearStudentAuth() }

function userKey(id: string | null | undefined): string {
  const v = String(id || 'unknown').trim()
  return v ? v.toLowerCase() : 'unknown'
}

export function getViolationCountKey(id: string | null | undefined): string {
  return `proctor_violation_count:${userKey(id)}`
}

export function getBannedKey(id: string | null | undefined): string {
  return `proctor_banned:${userKey(id)}`
}

export function getBannedMessageKey(id: string | null | undefined): string {
  return `proctor_banned_message:${userKey(id)}`
}

export function loadViolationCount(id: string | null | undefined): number {
  if (typeof window === 'undefined') return 0
  const key = getViolationCountKey(id)
  const raw = localStorage.getItem(key)
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function saveViolationCount(id: string | null | undefined, count: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getViolationCountKey(id), String(count))
}

export function markBanned(id: string | null | undefined, message: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(getBannedKey(id), 'true')
  if (message) localStorage.setItem(getBannedMessageKey(id), message)
}

export function isLocallyBanned(id: string | null | undefined): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(getBannedKey(id)) === 'true'
}

export function getBannedMessage(id: string | null | undefined): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(getBannedMessageKey(id)) || ''
}

export function clearLocalBan(id: string | null | undefined): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getBannedKey(id))
  localStorage.removeItem(getBannedMessageKey(id))
  localStorage.removeItem(getViolationCountKey(id))
}

export function normalizeMatric(matricNumber: string | null | undefined): string {
  return String(matricNumber || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

export interface AuthState {
  token: string;
  role: 'student' | 'admin';
  user: {
    matricNumber?: string;
    username?: string;
    surname?: string;
    firstName?: string;
    lastName?: string;
    department?: string;
  };
}
