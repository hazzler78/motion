# SD Motion Assistant

En AI-driven webbapplikation för att hjälpa Sverigedemokraterna skriva effektiva motioner.

## Funktioner

- Säker inloggning med Clerk
- AI-genererade motioner baserade på ämnesbeskrivningar
- Modern och användarvänlig design i partiets färger
- Responsiv layout som fungerar på alla enheter

## Installation

1. Klona repot:
```bash
git clone [repo-url]
cd motion-assistant
```

2. Installera beroenden:
```bash
npm install
```

3. Skapa en `.env.local` fil i projektets rot och lägg till följande miljövariabler:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
OPENAI_API_KEY=your_openai_api_key
```

4. Starta utvecklingsservern:
```bash
npm run dev
```

5. Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## Teknisk stack

- Next.js 14 med App Router
- TypeScript
- Tailwind CSS
- Clerk för autentisering
- OpenAI API för AI-generering
- Radix UI för komponenter

## Utveckling

- `npm run dev` - Starta utvecklingsservern
- `npm run build` - Bygg projektet för produktion
- `npm run start` - Starta produktionsservern
- `npm run lint` - Kör linting

## Licens

[Lägg till din licens här]
