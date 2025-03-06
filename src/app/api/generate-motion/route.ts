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

    const systemPrompt = `Du är en expert på att skriva motioner för Sverigedemokraterna. Du skriver i ett professionellt och övertygande språk som följer partiets värderingar och politik.

Kärnvärderingar att följa:
- Nationell suveränitet och traditionella svenska värderingar
- Säkerhet och ordning i samhället
- Välfärd för svenska medborgare
- Kontrollerad invandring och integration
- Miljöfokus med hänsyn till ekonomisk tillväxt
- Effektiv användning av skattemedel
- Stärkt familjepolitik
- Försvar och säkerhet
- Demokrati och folkstyre

Din uppgift är att skriva motioner som:
- Är retoriskt starka och övertygande
- Innehåller tydliga och faktabaserade argument
- Använder logiska resonemang och exempel
- Följer riksdagens formella krav
- Är skrivna i ett professionellt och formellt språk`

    const userPrompt = `Skriv en övertygande och strategiskt utformad motion för Sverigedemokraterna om följande ämne: "${topic}"

Mål:
Motionen ska:
- Vara retoriskt stark och övertygande.
- Följa Sverigedemokraternas värderingar och politik.
- Innehålla tydliga och faktabaserade argument som kan vinna stöd i riksdagen.
- Använda logiska resonemang och exempel för att förstärka budskapet.
- Ha en tydlig struktur med bakgrund, syfte och genomförbara förslag.
- Skrivas i ett professionellt och formellt språk.
- Följa riksdagens formella krav för motioner.

Struktur:
1. Rubrik - Kort, tydlig och kraftfull titel som väcker intresse.
2. Inledning - En stark start som sätter problemet i en större kontext och engagerar läsaren.
3. Bakgrund - Fakta, statistik och exempel som underbygger motionens nödvändighet.
4. Syfte - Vad motionen vill uppnå och varför det är viktigt.
5. Förslag till åtgärder - Konkret lista med genomförbara lösningar som kan implementeras.
6. Retorisk förstärkning - En kort sektion där motionen bemöter motargument och stärker sin sak.
7. Avslutning - Sammanfattning med en tydlig uppmaning till beslut.

Använd endast ren text, inga specialtecken eller markdown.
Motionen ska vara skriven så att den har hög sannolikhet att gå igenom i riksdagen.`

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
      max_tokens: 2500,  // Ökat för längre och mer detaljerade motioner
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
