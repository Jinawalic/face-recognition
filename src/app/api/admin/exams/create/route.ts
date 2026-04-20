import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { title, description, duration } = await request.json()

    if (!title) {
      return NextResponse.json({ message: 'Exam title is required' }, { status: 400 })
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || '',
        duration: duration || 60,
      }
    })

    return NextResponse.json({ id: exam.id, title: exam.title })
  } catch (error) {
    console.error('Create exam error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
