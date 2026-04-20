import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    const admin = await prisma.admin.findUnique({
      where: { username },
    })

    if (!admin || admin.password !== password) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({
      token: `adm_${admin.id}_${Date.now()}`,
      role: 'admin',
      user: {
        id: admin.id,
        username: admin.username
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
