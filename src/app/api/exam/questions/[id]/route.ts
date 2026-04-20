import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const questions = await prisma.question.findMany({
      where: { examId: id },
      orderBy: { createdAt: 'asc' }
    })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: 'No questions found for this exam' }, { status: 404 })
    }

    return NextResponse.json(questions)
  } catch (error) {
    console.error('Fetch questions error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
