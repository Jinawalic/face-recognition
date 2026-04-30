import { NextRequest, NextResponse } from 'next/server'
import { findAdminByUsername } from '@/lib/auth-db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 })
    }

    const admin = await findAdminByUsername(username)

    if (!admin || admin.password !== password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({
      token: `adm_${admin.id}_${Date.now()}`,
      role: 'admin',
      username: admin.username,
      user: {
        id: admin.id,
        username: admin.username
      }
    })
  } catch (error) {
    console.error('Admin login error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === 'object' && error && 'code' in error ? (error as any).code : undefined,
      meta: typeof error === 'object' && error && 'meta' in error ? (error as any).meta : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
