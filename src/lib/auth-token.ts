export function getBearerToken(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) return null

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

export function getStudentIdFromToken(token: string | null | undefined): string | null {
  if (!token || !token.startsWith('std_')) return null

  const parts = token.split('_')
  if (parts.length < 3) return null

  return parts[1] || null
}
