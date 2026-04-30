import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getBearerToken, getStudentIdFromToken } from '@/lib/auth-token'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request.headers.get('authorization'))
    const studentId = getStudentIdFromToken(token)

    const [takenResults, exams] = await Promise.all([
      studentId
        ? prisma.result.findMany({
            where: { studentId },
            select: { examId: true },
          })
        : Promise.resolve([]),
      prisma.exam.findMany({
        include: {
          _count: {
            select: { questions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
    ])

    const takenExamIds = new Set(takenResults.map((result) => result.examId))
    const availableExams = studentId
      ? exams.filter((exam) => !takenExamIds.has(exam.id))
      : exams
    return NextResponse.json(availableExams)
  } catch (error) {
    console.error('Fetch exams error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
