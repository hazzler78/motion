import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface OpenAIError extends Error {
  response?: {
    status: number;
  };
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { topic } = await req.json()

    if (!topic || topic.trim().length < 5) {
      return new NextResponse('Valid topic is required', { status: 400 })
    }

    const prompt = `Skriv en motion för Sverigedemokraterna om följande ämne: "${topic}"

Motionen ska:
- Följa Sverigedemokraternas värderingar och politik.
- Ha en tydlig struktur med bakgrund, syfte och förslag.
- Innehålla konkreta åtgärdsförslag.
- Vara skriven i ett professionellt och övertygande språk.
- Följa riksdagens formella krav för motioner.

Struktur:
1. Rubrik
2. Bakgrund
3. Syfte
4. Förslag till åtgärder
5. Avslutning

Använd endast ren text, inga specialtecken eller markdown.`

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Du är en expert på att skriva motioner för Sverigedemokraterna. Du skriver i ett professionellt och övertygande språk som följer partiets värderingar och politik.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,  // Sänkt temperatur för mer formell och konsekvent text
      max_tokens: 2000,
      stream: true
    })

    // Konvertera stream till ReadableStream
    const encoder = new TextEncoder()
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode("Ett fel uppstod vid generering av texten."))
        }
        controller.close()
      }
    })

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
      }
    })

  } catch (error: unknown) {
    console.error('Error generating motion:', error)
    if (error && typeof error === 'object' && 'response' in error) {
      const openAIError = error as OpenAIError
      return new NextResponse(`OpenAI API error: ${openAIError.response?.status}`, { status: openAIError.response?.status })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
