import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { students } = await request.json()

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ message: 'No students provided' }, { status: 400 })
    }

    let inserted = 0
    let skipped = 0

    for (const s of students) {
      if (!s.matricNumber) { skipped++; continue }
      try {
        await prisma.student.upsert({
          where: { matricNumber: s.matricNumber.toUpperCase() },
          update: {},
          create: {
            matricNumber: s.matricNumber.toUpperCase(),
            surname: s.surname || '',
            firstName: s.firstName || '',
            lastName: s.lastName || '',
            department: s.department || '',
          }
        })
        inserted++
      } catch {
        skipped++
      }
    }

    return NextResponse.json({ inserted, skipped })
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
