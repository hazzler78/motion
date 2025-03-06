'use client'

import { useState, ChangeEvent, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function MotionAssistant() {
  const [topic, setTopic] = useState('')
  const [motion, setMotion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      signOut().then(() => {
        router.push('/sign-in')
      })
    }, 30 * 60 * 1000) // 30 minutes in milliseconds

    return () => clearTimeout(timeoutId)
  }, [signOut, router])

  const generateMotion = async () => {
    setIsLoading(true)
    setMotion('')
    try {
      const response = await fetch('/api/generate-motion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate motion')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      let accumulatedMotion = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        accumulatedMotion += chunk
        setMotion(accumulatedMotion)
      }
    } catch (error) {
      console.error('Error generating motion:', error)
      setMotion('Ett fel uppstod vid generering av motionen.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTopicChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTopic(e.target.value)
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl mb-4">Skapa ny motion</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-sd-gray mb-2">
              Ämne för motionen
            </label>
            <Textarea
              id="topic"
              value={topic}
              onChange={handleTopicChange}
              placeholder="Beskriv ämnet för din motion..."
              className="w-full"
              rows={4}
            />
          </div>
          
          <Button
            onClick={generateMotion}
            disabled={isLoading || !topic}
            className="btn-primary"
          >
            {isLoading ? 'Genererar...' : 'Generera motion'}
          </Button>
        </div>
      </div>

      {motion && (
        <div className="card">
          <h2 className="text-2xl mb-4">Genererad motion</h2>
          <div className="prose max-w-none whitespace-pre-wrap">
            {motion}
          </div>
        </div>
      )}
    </div>
  )
} 