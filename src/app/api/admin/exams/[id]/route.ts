import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ message: 'Exam ID is required' }, { status: 400 })
    }

    await prisma.exam.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Exam deleted successfully' })
  } catch (error) {
    console.error('Delete exam error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
