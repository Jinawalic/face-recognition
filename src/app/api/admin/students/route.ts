import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matricNumber, surname, firstName, lastName, department } = body

    if (!matricNumber) {
      return NextResponse.json({ message: 'Matric number is required' }, { status: 400 })
    }

    const student = await prisma.student.upsert({
      where: { matricNumber: matricNumber.toUpperCase() },
      update: { surname, firstName, lastName, department },
      create: {
        matricNumber: matricNumber.toUpperCase(),
        surname: surname || '',
        firstName: firstName || '',
        lastName: lastName || '',
        department: department || '',
      }
    })

    return NextResponse.json({ success: true, id: student.id })
  } catch (error) {
    console.error('Add student error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
