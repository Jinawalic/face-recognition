import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // assuming id is matric number in some routes or DB id
) {
  try {
    const { id } = await params
    
    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { matricNumber: id.toUpperCase() }
    })

    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 })
    }

    // Delete associated records first (cascading might handle it but let's be safe if not configured)
    await prisma.violation.deleteMany({ where: { studentId: student.id } })
    await prisma.result.deleteMany({ where: { studentId: student.id } })
    
    await prisma.student.delete({
      where: { id: student.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
