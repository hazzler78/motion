import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Starting log usage request...')
    
    const { userId, user } = await getAuth(request)
    
    if (!userId) {
      console.log('No userId found in request')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      console.log('No filename provided')
      return new NextResponse('Filename is required', { status: 400 })
    }

    // Skapa loggdata
    const logData = {
      userId,
      email: user?.emailAddresses?.[0]?.emailAddress || '',
      timestamp: new Date().toISOString(),
    }

    console.log('Attempting to save log data:', {
      filename,
      logData,
      hasEmail: !!user?.emailAddresses?.[0]?.emailAddress
    })

    // Spara till Blob Storage
    const blob = await put(filename, JSON.stringify(logData), {
      access: 'public',
    })

    console.log('Successfully saved to blob storage:', blob)

    return NextResponse.json(blob)
  } catch (error) {
    console.error('Error logging usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 