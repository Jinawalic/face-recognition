import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { matricNumber } = await request.json()

    if (!matricNumber) {
      return NextResponse.json({ message: 'Matric number is required' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({
      where: { matricNumber: matricNumber.toUpperCase() },
    })

    if (!student) {
      return NextResponse.json({ message: 'Student record not found' }, { status: 404 })
    }

    if (student.isBanned) {
      return NextResponse.json({ 
        message: 'Your account has been suspended due to excessive irregularities.',
        is_banned: true 
      }, { status: 403 })
    }

    return NextResponse.json({
      token: `std_${student.id}_${Date.now()}`,
      role: 'student',
      matricNumber: student.matricNumber,
      user: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        surname: student.surname,
        department: student.department
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
