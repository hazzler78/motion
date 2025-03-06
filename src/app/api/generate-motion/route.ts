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

Kärnvärderingar och regionala prioriteringar:
- Nationell suveränitet och traditionella svenska värderingar
- Säkerhet, ordning och välfärd för svenska medborgare
- Kontrollerad invandring och integration
- Miljöfokus med hänsyn till ekonomisk tillväxt
- Effektiv användning av skattemedel
- Stärkt familjepolitik och demokrati

Regional kontext för Värmland:
- Landsbygdsutveckling och småföretagande
- Balans mellan städer och landsbygd
- Regional infrastruktur och kommunikationer
- Hälso- och sjukvård i regionen
- Kultur, fritid och utbildning
- Miljö och klimat
- Näringsliv och arbetsmarknad

Din uppgift är att skriva regionala motioner som:
- Är retoriskt starka och övertygande
- Innehåller tydliga och faktabaserade argument
- Följer regionfullmäktiges formella krav
- Tar hänsyn till Värmlands specifika förutsättningar
- Fokuserar på regionala frågor och lösningar`

    const userPrompt = `Skriv en övertygande regional motion för Sverigedemokraterna i Värmland om följande ämne: "${topic}"

Mål:
- Vara retoriskt stark och övertygande
- Följa Sverigedemokraternas värderingar och politik
- Innehålla tydliga och faktabaserade argument
- Ha en tydlig struktur med bakgrund, syfte och genomförbara förslag
- Ta hänsyn till Värmlands specifika förutsättningar
- Fokusera på regionala frågor och lösningar

Struktur:
1. Rubrik - Kort, tydlig och kraftfull titel
2. Inledning - Sätt problemet i regional kontext
3. Bakgrund - Fakta och exempel med regional fokus
4. Syfte - Vad motionen vill uppnå för Värmland
5. Förslag - Genomförbara lösningar inom regionens ramar
6. Retorisk förstärkning - Bemöt motargument
7. Avslutning - Sammanfattning och uppmaning

Använd endast ren text, inga specialtecken eller markdown.
Motionen ska vara skriven för att gå igenom i regionfullmäktige.`

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
      temperature: 0.6,  // Sänkt temperatur för mer konsekvent och formell text
      max_tokens: 2200,  // Ökat för längre och mer detaljerade motioner
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
          controller.enqueue(encoder.encode("Ett fel uppstod vid generering av texten. Vänligen försök igen."))
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
