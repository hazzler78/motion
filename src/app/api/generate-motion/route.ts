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

    // Logga användningen
    try {
      console.log('Attempting to log usage for topic:', topic)
      const logResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/log-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      })
      console.log('Log usage response status:', logResponse.status)
      if (!logResponse.ok) {
        console.error('Failed to log usage:', await logResponse.text())
      }
    } catch (error) {
      console.error('Error logging usage:', error)
      // Fortsätt ändå med genereringen även om loggningen misslyckas
    }

    const systemPrompt = `Du är en erfaren politisk sekreterare för Sverigedemokraterna i Värmland med över 10 års erfarenhet av att skriva motioner. Du känner partiets värderingar och retorik inifrån och ut.

PARTIETS VÄRDERINGAR:
---
- Nationell suveränitet och traditionella värderingar
- Säkerhet och välfärd för svenska medborgare
- Kontrollerad invandring
- Miljöfokus med ekonomisk tillväxt
- Effektiv skatteanvändning
- Stärkt familjepolitik
---

VÄRMLANDSPERSPEKTIV:
---
- Landsbygdsutveckling och småföretagande
- Balans städer/landsbygd
- Regional infrastruktur
- Hälso- och sjukvård
- Kultur och utbildning
- Miljö och klimat
- Näringsliv
---

MOTIONENS STRUKTUR (SKRIV UTAN RUBRIKER):
---
1. Skriv en tydlig och slagkraftig rubrik som fångar motionens kärna
2. Skriv en inledning som ger kontext och kopplar till partiets värderingar
3. Skriv en bakgrund med relevanta fakta och siffror
4. Skriv syftet med motionen och dess betydelse för Värmland
5. Skriv förslagen med exakt detta format (OBS: "Sverigedemokraterna yrkar" ska ENDAST finnas här)
6. Skriv motargument som bemöter potentiella invändningar
7. Skriv en avslutning som sammanfattar motionens betydelse
---

STRIKTA REGLER FÖR FORMAT:
---
1. Skriv "Sverigedemokraterna yrkar" ENDAST i förslag-delen, ingen annanstans
2. Efter "Sverigedemokraterna yrkar", börja varje förslag med exakt "att"
3. Skriv varje förslag på en ny rad
4. Använd INGA andra formuleringar som "förslag till åtgärder" eller liknande
5. Använd INGA numrerade punkter (1, 2, 3, etc.)
6. Skriv retoriskt starka, faktabaserade motioner
7. Skriv UTAN rubriker som "Rubrik:", "Inledning:", etc.
---

EXEMPEL PÅ KORREKT FORMAT:
---
Exempel 1:
Anställ en återvandringshandläggare för en tryggare framtid i Värmland

I en tid där det svenska välfärdssystemet är under press...

[Inledning, Bakgrund, Syfte...]

Sverigedemokraterna yrkar

att Region Värmland ska...
att Kommunerna ska...
att Välfärden ska...

[Motargument, Avslutning...]

Exempel 2:
Stärk skolan för en bättre framtid i Värmland

I en tid där utbildningens kvalitet är avgörande...

[Inledning, Bakgrund, Syfte...]

Sverigedemokraterna yrkar

att Skolan ska...
att Lärarna ska...
att Eleverna ska...

[Motargument, Avslutning...]
---

FELAKTIGT FORMAT (ANVÄND INTE DETTA):
---
Rubrik: Förslag till åtgärder
Inledning: 1. Region Värmland ska...
Bakgrund: 2. Kommunerna ska...
Syfte: 3. Välfärden ska...

eller

Sverigedemokraterna yrkar att

att Region Värmland ska...
att Kommunerna ska...

eller

Sverigedemokraterna yrkar
[inledning...]
Sverigedemokraterna yrkar
[förslag...]
---`

    const userPrompt = `Skriv en regional motion för Sverigedemokraterna i Värmland om: "${topic}"

FÖLJ DETTA FORMAT STEG FÖR STEG (SKRIV UTAN RUBRIKER):
---
1. Skriv en tydlig och slagkraftig rubrik som fångar motionens kärna
2. Skriv en inledning som ger kontext och kopplar till partiets värderingar
3. Skriv en bakgrund med relevanta fakta och siffror
4. Skriv syftet med motionen och dess betydelse för Värmland
5. Skriv förslagen med exakt detta format (OBS: "Sverigedemokraterna yrkar" ska ENDAST finnas här):
   Sverigedemokraterna yrkar

   att Region Värmland ska...
   att Kommunerna ska...
   att Välfärden ska...
6. Skriv motargument som bemöter potentiella invändningar
7. Skriv en avslutning som sammanfattar motionens betydelse
---

VIKTIGT: 
---
- Använd endast ren text, inga specialtecken
- Följ exakt formatet ovan
- Använd INGA numrerade punkter
- Börja ALLTID varje förslag med "att"
- Skriv "Sverigedemokraterna yrkar" ENDAST i förslag-delen
- Skriv i partiets retoriska stil
- Använd konkreta exempel och siffror när möjligt
- Skriv UTAN rubriker som "Rubrik:", "Inledning:", etc.
---`

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
      max_tokens: 8000,
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
