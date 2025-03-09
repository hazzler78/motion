import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('=== Starting log-usage request ===')
  
  try {
    // Verifiera miljövariabler först
    const envCheck = {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      tokenStart: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 4),
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL
    }
    
    console.log('Environment check:', envCheck)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN')
      return new NextResponse('Blob Storage not configured', { status: 500 })
    }

    // Hämta data från request body
    console.log('Parsing request body...')
    let body;
    try {
      body = await request.json()
      console.log('Request body:', body)
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new NextResponse('Invalid request body', { status: 400 })
    }

    const { topic, email } = body

    if (!topic || !email) {
      console.error('Missing required fields:', { hasTopic: !!topic, hasEmail: !!email })
      return new NextResponse('Topic and email are required', { status: 400 })
    }

    // Skapa timestamp och filnamn
    const now = new Date()
    const timestamp = now.toISOString()
    const sanitizedTimestamp = timestamp.replace(/[:.]/g, '-')
    const filename = `usage/${sanitizedTimestamp}.json`

    // Skapa loggdata - spara både userId och email för bakåtkompatibilitet
    const logData = {
      userId: email, // För bakåtkompatibilitet
      email,
      topic,
      timestamp,
    }

    console.log('Attempting to save log:', {
      filename,
      logData,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'Present' : 'Missing'
    })

    try {
      console.log('Calling Vercel Blob put...')
      const blob = await put(filename, JSON.stringify(logData), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token: process.env.BLOB_READ_WRITE_TOKEN // Explicitly pass token
      })

      console.log('Successfully saved to blob:', {
        url: blob.url,
        pathname: blob.pathname
      })

      return NextResponse.json({ 
        success: true, 
        blob: {
          url: blob.url,
          pathname: blob.pathname
        }
      })
    } catch (blobError) {
      console.error('Error saving to blob:', blobError)
      if (blobError instanceof Error) {
        console.error('Blob error details:', {
          name: blobError.name,
          message: blobError.message,
          stack: blobError.stack
        })
      }
      // Return a more specific error message
      return new NextResponse(
        JSON.stringify({
          error: 'Failed to save to Blob Storage',
          details: blobError instanceof Error ? blobError.message : 'Unknown error'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
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
    return new NextResponse(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 