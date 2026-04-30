import { NextRequest, NextResponse } from 'next/server'
import { upsertStudentAccount } from '@/lib/auth-db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const matricNumber = typeof body?.matricNumber === 'string' ? body.matricNumber.trim() : ''
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''

    if (!matricNumber || !fullName) {
      return NextResponse.json({ message: 'Full name and matric number are required' }, { status: 400 })
    }

    const student = await upsertStudentAccount({ matricNumber, fullName })

    return NextResponse.json({
      token: `std_${student.id}_${Date.now()}`,
      role: 'student',
      matricNumber: student.matricNumber,
      user: {
        id: student.id,
        matricNumber: student.matricNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        surname: student.surname,
        department: student.department,
      },
    })
  } catch (error) {
    console.error('Student register error:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: typeof error === 'object' && error && 'code' in error ? (error as any).code : undefined,
      meta: typeof error === 'object' && error && 'meta' in error ? (error as any).meta : undefined,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
