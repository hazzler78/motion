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

interface GenerateMotionRequest {
  topic: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { topic } = await req.json() as GenerateMotionRequest

    if (!topic || topic.trim().length < 5) {
      return new NextResponse('Valid topic is required', { status: 400 })
    }

    const systemPrompt = `Du är en expert på att skriva regionala motioner för Sverigedemokraterna i Värmland.

Kärnvärderingar:
- Nationell suveränitet och traditionella värderingar
- Säkerhet och välfärd för svenska medborgare
- Kontrollerad invandring
- Miljöfokus med ekonomisk tillväxt
- Effektiv skatteanvändning
- Stärkt familjepolitik

Värmlandsperspektiv:
- Landsbygdsutveckling och småföretagande
- Balans städer/landsbygd
- Regional infrastruktur
- Hälso- och sjukvård
- Kultur och utbildning
- Miljö och klimat
- Näringsliv

Skriv retoriskt starka, faktabaserade motioner. Inled med "Sverigedemokraterna yrkar att" och börja varje förslag med "att".`

    const userPrompt = `Skriv en regional motion för Sverigedemokraterna i Värmland om: "${topic}"

Struktur:
1. Rubrik
2. Inledning
3. Bakgrund
4. Syfte
5. Förslag:
   Sverigedemokraterna yrkar
   att Region Värmland ska...
   att Kommunerna ska...
6. Motargument
7. Avslutning

Använd ren text, inga specialtecken.`

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 4000,
      stream: true
    })

    // Konvertera stream till ReadableStream med timeout-hantering
    const encoder = new TextEncoder()
    const streamResponse = new ReadableStream({
      async start(controller) {
        try {
          const timeoutId = setTimeout(() => {
            controller.enqueue(encoder.encode("\n\n[Notering: Texten har avbrutits på grund av tidsbegränsning. Vänligen försök igen med ett kortare ämne.]"))
            controller.close()
          }, 30000)

          let buffer = ''
          for await (const chunk of stream) {
            clearTimeout(timeoutId)
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              buffer += content
              // Skicka bufferten när den når en rimlig storlek eller vid radbrytning
              if (buffer.length > 15 || content.includes('\n')) {
                try {
                  controller.enqueue(encoder.encode(buffer))
                  buffer = ''
                  // Ge Vercel mer tid att hantera varje chunk
                  await new Promise(resolve => setTimeout(resolve, 50))
                } catch (err) {
                  console.error('Error sending chunk:', err)
                  // Om vi får ett fel vid sändning, vänta lite längre och försök igen
                  await new Promise(resolve => setTimeout(resolve, 100))
                  controller.enqueue(encoder.encode(buffer))
                  buffer = ''
                }
              }
            }
          }
          // Skicka eventuell återstående text i bufferten
          if (buffer) {
            try {
              controller.enqueue(encoder.encode(buffer))
            } catch (err) {
              console.error('Error sending final buffer:', err)
            }
          }
          clearTimeout(timeoutId)
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode("\n\nEtt fel uppstod vid generering av texten. Vänligen försök igen."))
        }
        controller.close()
      }
    })

    return new Response(streamResponse, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })

  } catch (error: unknown) {
    console.error('Error generating motion:', error)
    if (error && typeof error === 'object' && 'response' in error) {
      const openAIError = error as OpenAIError
      return new NextResponse(
        `OpenAI API error: ${openAIError.response?.status}. Vänligen kontrollera din API-nyckel och försök igen.`, 
        { status: openAIError.response?.status }
      )
    }
    return new NextResponse(
      'Ett oväntat fel uppstod. Vänligen försök igen senare.', 
      { status: 500 }
    )
  }
}
