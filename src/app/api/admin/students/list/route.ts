import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        violations: {
          orderBy: { timestamp: 'desc' }
        },
        results: {
          include: {
            exam: { select: { title: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mapped = students.map(s => ({
      matric_number: s.matricNumber,
      surname: s.surname,
      first_name: s.firstName,
      last_name: s.lastName,
      department: s.department,
      is_banned: s.isBanned,
      violation_count: s.violations.length,
      violations: s.violations.map(v => ({ type: v.type, message: v.message, timestamp: v.timestamp })),
      results: s.results.map(r => ({
        exam_title: r.exam.title,
        score: r.score,
        total: r.total,
        createdAt: r.createdAt
      }))
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Fetch admin students error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
