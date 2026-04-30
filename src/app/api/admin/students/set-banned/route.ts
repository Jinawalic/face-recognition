import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { matricNumber } = await request.json()

    if (!matricNumber) {
      return NextResponse.json({ message: 'Matric number is required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, isBanned: false })
  } catch (error) {
    console.error('Set banned error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
