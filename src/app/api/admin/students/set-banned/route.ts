import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { matricNumber, is_banned } = await request.json()

    if (!matricNumber) {
      return NextResponse.json({ message: 'Matric number is required' }, { status: 400 })
    }

    const student = await prisma.student.update({
      where: { matricNumber: matricNumber.toUpperCase() },
      data: { isBanned: is_banned }
    })

    // Reset violations if unbanning
    if (!is_banned) {
      await prisma.violation.deleteMany({
        where: { studentId: student.id }
      })
    }

    return NextResponse.json({ success: true, isBanned: student.isBanned })
  } catch (error) {
    console.error('Set banned error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
