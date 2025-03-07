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
      console.log('No userId found in request')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { topic } = await req.json() as LogUsageRequest

    if (!topic) {
      console.log('No topic provided in request')
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

    console.log('Attempting to save log data:', {
      filename,
      logData,
      hasEmail: !!user?.emailAddresses?.[0]?.emailAddress
    })

    // Spara till Blob Storage
    const blob = await put(filename, JSON.stringify(logData), {
      access: 'public',
      addRandomSuffix: false,
    })

    console.log('Successfully saved to blob storage:', blob)

    return NextResponse.json(blob)
  } catch (error) {
    console.error('Error logging usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 