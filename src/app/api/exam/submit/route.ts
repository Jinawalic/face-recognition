import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { matricNumber, examId, answers, questions } = await request.json()

    if (!matricNumber || !examId || !questions || !answers) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const student = await prisma.student.findUnique({
      where: { matricNumber: matricNumber.toUpperCase() }
    })

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 })
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId }
    })

    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 })
    }

    const existingResult = await prisma.result.findFirst({
      where: {
        studentId: student.id,
        examId
      },
      select: { id: true }
    })

    if (existingResult) {
      return NextResponse.json(
        { message: 'You have already submitted this exam.' },
        { status: 409 }
      )
    }

    // Calculate score
    let score = 0
    const total = questions.length
    questions.forEach((q: any, idx: number) => {
      const selectedOption = answers[idx]
      const correctOption = q.options[q.correctIndex]
      if (selectedOption === correctOption) score++
    })

    const result = await prisma.result.create({
      data: {
        studentId: student.id,
        examId,
        score,
        total,
        answers: answers,
      }
    })

    return NextResponse.json({ success: true, id: result.id, score, total })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      (error as any).code === 'P2002'
    ) {
      return NextResponse.json(
        { message: 'You have already submitted this exam.' },
        { status: 409 }
      )
    }
    console.error('Submit exam error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
