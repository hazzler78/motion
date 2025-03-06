import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import MotionAssistant from '@/components/MotionAssistant'

export default async function Home() {
  const session = await auth()
  
  if (!session?.userId) {
    redirect('/sign-in')
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-sd-blue mb-2">
          SD Motion Assistant
        </h1>
        <p className="text-sd-gray">
          Hjälpmedel för att skriva effektiva motioner
        </p>
      </header>
      
      <MotionAssistant />
    </div>
  )
}
