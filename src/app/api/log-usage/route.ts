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

    // Hämta filename och userId från query params
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      console.error('No filename provided')
      return new NextResponse('Filename is required', { status: 400 })
    }

    // Hämta topic från request body
    const body = await request.json()
    const { topic } = body

    // Skapa loggdata
    const logData = {
      topic,
      timestamp: new Date().toISOString(),
    }

    console.log('Attempting to save log:', {
      filename,
      logData
    })

    const blob = await put(filename, JSON.stringify(logData), {
      access: 'public',
      addRandomSuffix: true,
    })

    console.log('Successfully saved to blob:', {
      url: blob.url,
      pathname: blob.pathname
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