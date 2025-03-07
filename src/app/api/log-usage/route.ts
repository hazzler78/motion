import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Starting log usage request...')
    
    // Först, logga miljövariabler
    console.log('Environment variables:', {
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenFirstChars: process.env.BLOB_READ_WRITE_TOKEN ? process.env.BLOB_READ_WRITE_TOKEN.substring(0, 4) + '...' : 'missing',
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      nodeEnv: process.env.NODE_ENV
    })

    // Testa att spara en enkel testfil först
    try {
      console.log('Testing blob storage with simple file...')
      const testBlob = await put('test.txt', 'Hello World', {
        access: 'public',
        addRandomSuffix: true,
      })
      console.log('Test blob created successfully:', testBlob)
    } catch (testError) {
      console.error('Test blob creation failed:', testError)
      return new NextResponse('Blob Storage test failed', { status: 500 })
    }

    // Om testfilen fungerade, fortsätt med den riktiga implementationen
    const { userId, user } = await getAuth(request)
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    if (!filename) {
      return new NextResponse('Filename is required', { status: 400 })
    }

    const logData = {
      userId,
      email: user?.emailAddresses?.[0]?.emailAddress || '',
      timestamp: new Date().toISOString(),
    }

    const blob = await put(filename, JSON.stringify(logData), {
      access: 'public',
      addRandomSuffix: true,
    })

    return NextResponse.json(blob)
  } catch (error) {
    console.error('Error in log-usage:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 