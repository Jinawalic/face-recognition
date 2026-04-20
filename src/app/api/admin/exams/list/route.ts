import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const exams = await prisma.exam.findMany({
      include: {
        _count: {
          select: { questions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mapped = exams.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      duration: e.duration,
      questions_count: e._count.questions
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Fetch admin exams error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
