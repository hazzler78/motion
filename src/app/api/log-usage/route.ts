import { getAuth } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Starting log usage request...')
    console.log('Request URL:', request.url)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { userId, user } = await getAuth(request)
    
    if (!userId) {
      console.log('No userId found in request')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    console.log('Filename from query params:', filename)

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
      hasEmail: !!user?.emailAddresses?.[0]?.emailAddress,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN ? 'exists' : 'missing'
    })

    try {
      // Spara till Blob Storage
      console.log('Calling put with options:', {
        access: 'public',
        addRandomSuffix: false
      })
      
      const blob = await put(filename, JSON.stringify(logData), {
        access: 'public',
        addRandomSuffix: false,
      })

      console.log('Successfully saved to blob storage:', blob)

      return NextResponse.json(blob)
    } catch (blobError: unknown) {
      console.error('Error saving to blob storage:', blobError)
      if (blobError instanceof Error) {
        console.error('Error details:', {
          name: blobError.name,
          message: blobError.message,
          stack: blobError.stack
        })
      }
      throw blobError
    }
  } catch (error) {
    console.error('Error logging usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 