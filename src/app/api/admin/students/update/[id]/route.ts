import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // id is matric number
    const { surname, firstName, lastName, department } = await request.json()

    const student = await prisma.student.update({
      where: { matricNumber: id.toUpperCase() },
      data: {
        surname,
        firstName,
        lastName,
        department
      }
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Update student error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
