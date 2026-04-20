import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { matricNumber, type, message, meta } = await request.json()

    if (!matricNumber) {
      return NextResponse.json({ message: 'Matric number is required' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({
      where: { matricNumber: matricNumber.toUpperCase() },
    })

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 })
    }

    // Save violation
    const violation = await prisma.violation.create({
      data: {
        studentId: student.id,
        type,
        message,
        meta: meta || {},
      }
    })

    // Check violation count to auto-ban (optional business logic)
    const count = await prisma.violation.count({
      where: { studentId: student.id }
    })

    let is_banned = false
    if (count >= 3) {
      await prisma.student.update({
        where: { id: student.id },
        data: { isBanned: true }
      })
      is_banned = true
    }

    return NextResponse.json({ 
      success: true, 
      id: violation.id, 
      count,
      is_banned 
    })
  } catch (error) {
    console.error('Report violation error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
