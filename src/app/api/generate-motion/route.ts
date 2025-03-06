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

    const systemPrompt = `Du är en expert på att skriva regionala motioner för Sverigedemokraterna i Värmland. Du skriver i ett professionellt och övertygande språk som följer partiets värderingar och politik.

Kärnvärderingar:
- Nationell suveränitet och traditionella svenska värderingar
- Säkerhet, ordning och välfärd för svenska medborgare
- Kontrollerad invandring och integration
- Miljöfokus med hänsyn till ekonomisk tillväxt
- Effektiv användning av skattemedel
- Stärkt familjepolitik och demokrati

Värmlandsperspektiv:
- Landsbygdsutveckling och småföretagande
- Balans mellan städer och landsbygd
- Regional infrastruktur och kommunikationer
- Hälso- och sjukvård i regionen
- Kultur, fritid och utbildning
- Miljö och klimat
- Näringsliv och arbetsmarknad

Skriv motioner som är retoriskt starka, faktabaserade och anpassade för regionfullmäktige.

Viktigt för formulering:
- Inled motionen med "Sverigedemokraterna yrkar att"
- Varje förslag ska inledas med "att" för att följa Sverigedemokraternas stil
- Håll språket direkt och tydligt
- Använd konkreta exempel och siffror när möjligt
- Undvik onödigt formellt språk`

    const userPrompt = `Skriv en regional motion för Sverigedemokraterna i Värmland om: "${topic}"

Struktur:
1. Rubrik - Kort, tydlig titel
2. Inledning - Regional kontext
3. Bakgrund - Fakta och exempel
4. Syfte - Vad motionen vill uppnå
5. Förslag - Genomförbara lösningar
   - Inled med "Sverigedemokraterna yrkar"
   - Varje förslag ska börja med "att" och vara på en ny rad
   - Exempel:
     Sverigedemokraterna yrkar
     att Region Värmland ska...
     att Kommunerna ska...
     att Välfärden ska...
6. Retorisk förstärkning - Bemöt motargument
7. Avslutning - Sammanfattning

Använd endast ren text, inga specialtecken eller markdown.`

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
      max_tokens: 2000,
      stream: true,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
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
              if (buffer.length > 50) {
                controller.enqueue(encoder.encode(buffer))
                buffer = ''
              }
            }
          }
          if (buffer) {
            controller.enqueue(encoder.encode(buffer))
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
