import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'
import { getAuth } from '@clerk/nextjs/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verifiera miljövariabler först
    const envCheck = {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenStart: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 4),
      nodeEnv: process.env.NODE_ENV
    }
    
    console.log('Environment check:', envCheck)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN')
      return new NextResponse('Blob Storage not configured', { status: 500 })
    }

    // Hämta användarinfo från Clerk
    const { userId, user } = await getAuth(request)
    if (!userId) {
      console.error('No userId found')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Hämta topic från request body
    const body = await request.json()
    const { topic } = body

    if (!topic) {
      console.error('No topic provided')
      return new NextResponse('Topic is required', { status: 400 })
    }

    // Skapa timestamp och filnamn
    const timestamp = new Date().toISOString()
    const filename = `usage/${userId}/${timestamp}.json`

    // Skapa loggdata
    const logData = {
      userId,
      email: user?.emailAddresses?.[0]?.emailAddress || '',
      topic,
      timestamp,
    }

    console.log('Attempting to save log:', {
      filename,
      logData
    })

    try {
      const blob = await put(filename, JSON.stringify(logData), {
        access: 'public',
        addRandomSuffix: false, // Vi vill ha exakt filnamn för enklare listning
        contentType: 'application/json'
      })

      console.log('Successfully saved to blob:', {
        url: blob.url,
        pathname: blob.pathname
      })

      return NextResponse.json({ success: true, blob })
    } catch (blobError) {
      console.error('Error saving to blob:', blobError)
      throw blobError
    }
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