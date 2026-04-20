import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { exam_id, question_text, options, correct_answer } = await request.json()

    if (!exam_id || !question_text || !Array.isArray(options)) {
      return NextResponse.json({ message: 'exam_id, question_text, and options are required' }, { status: 400 })
    }

    // Find correctIndex from correct_answer string
    const correctIndex = options.indexOf(correct_answer)

    const question = await prisma.question.create({
      data: {
        examId: exam_id,
        questionText: question_text,
        options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
      }
    })

    return NextResponse.json({ id: question.id })
  } catch (error) {
    console.error('Add question error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
