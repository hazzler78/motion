import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'

interface LogUsageRequest {
  topic: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await getAuth(req)
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { topic } = await req.json() as LogUsageRequest

    if (!topic) {
      return new NextResponse('Topic is required', { status: 400 })
    }

    // Skapa en unik filnamn med timestamp
    const timestamp = new Date().toISOString()
    const filename = `usage/${userId}/${timestamp}.json`

    // Skapa loggdata
    const logData = {
      userId,
      email: user?.emailAddresses?.[0]?.emailAddress || '',
      topic,
      timestamp,
    }

    // Spara till Blob Storage
    await put(filename, JSON.stringify(logData), {
      access: 'public',
      addRandomSuffix: false,
    })

    return new NextResponse('Usage logged successfully', { status: 200 })
  } catch (error) {
    console.error('Error logging usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 