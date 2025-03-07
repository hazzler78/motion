import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verifiera miljövariabler först
    const envCheck = {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenStart: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 4),
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      nodeEnv: process.env.NODE_ENV
    }
    
    console.log('Environment check:', envCheck)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN')
      return new NextResponse('Blob Storage not configured', { status: 500 })
    }

    // Testa blob storage med en enkel fil
    const testContent = {
      test: true,
      timestamp: new Date().toISOString()
    }

    try {
      console.log('Testing blob storage...')
      const testBlob = await put(`test-${Date.now()}.json`, JSON.stringify(testContent), {
        access: 'public',
        addRandomSuffix: true,
      })
      console.log('Test successful:', {
        url: testBlob.url,
        pathname: testBlob.pathname,
        contentType: testBlob.contentType
      })
    } catch (testError) {
      console.error('Blob test failed:', testError)
      if (testError instanceof Error) {
        console.error('Test error details:', {
          name: testError.name,
          message: testError.message,
          stack: testError.stack
        })
      }
      return new NextResponse('Blob Storage test failed', { status: 500 })
    }

    // Om vi kommer hit fungerade testet, fortsätt med den vanliga implementationen
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