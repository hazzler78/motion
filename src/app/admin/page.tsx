import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { list } from '@vercel/blob'

interface UsageLog {
  userId: string;
  email: string;
  topic: string;
  timestamp: string;
}

export default async function AdminPage() {
  const session = await auth()
  
  // Här kan du lägga till kontroll för admin-behörighet
  if (!session?.userId) {
    redirect('/')
  }

  console.log('Starting admin page load...')
  console.log('Environment:', {
    hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    tokenStart: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 4),
    nodeEnv: process.env.NODE_ENV
  })

  let blobs = []
  try {
    // Hämta alla loggfiler
    const result = await list({
      prefix: 'usage/',
      limit: 100,
      token: process.env.BLOB_READ_WRITE_TOKEN
    })
    blobs = result.blobs
    console.log('Successfully listed blobs:', {
      count: blobs.length,
      paths: blobs.map(b => b.pathname)
    })
  } catch (error) {
    console.error('Error listing blobs:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Fel vid hämtning av statistik</p>
          <p>Kunde inte hämta användningsstatistik. Försök igen senare.</p>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-2 text-sm">
              {error instanceof Error ? error.message : 'Unknown error'}
            </pre>
          )}
        </div>
      </div>
    )
  }

  // Läs innehållet i varje fil
  const usageLogs: UsageLog[] = []
  for (const blob of blobs) {
    try {
      console.log('Fetching blob:', blob.url)
      const response = await fetch(blob.url)
      
      if (!response.ok) {
        console.error('Failed to fetch blob:', {
          url: blob.url,
          status: response.status,
          statusText: response.statusText
        })
        continue
      }

      const text = await response.text()
      console.log('Raw blob content:', text)
      
      try {
        const data = JSON.parse(text)
        console.log('Parsed blob data:', data)
        
        if (data.userId && (data.email || data.topic)) {
          usageLogs.push(data)
          console.log('Added log entry:', data)
        } else {
          console.error('Invalid data structure:', data)
        }
      } catch (parseError) {
        console.error('Error parsing blob data:', parseError)
      }
    } catch (error) {
      console.error('Error fetching blob:', error)
    }
  }

  console.log('Final usage logs:', {
    count: usageLogs.length,
    logs: usageLogs
  })

  // Beräkna statistik
  const totalUsers = new Set(usageLogs.map(log => log.userId)).size
  const totalUsage = usageLogs.length

  // Sortera loggarna efter datum (nyast först)
  const sortedLogs = usageLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Beräkna mest populära ämnen
  const topicCounts = usageLogs.reduce((acc, log) => {
    acc[log.topic] = (acc[log.topic] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Användningsstatistik</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Totalt antal användare</h2>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Totalt antal genereringar</h2>
          <p className="text-3xl font-bold">{totalUsage}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Senaste användningen</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Användare
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ämne
                </th>
                <th className="px-6 py-3 border-b-2 border-gray-300 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tidpunkt
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map((log, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.email || log.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.topic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString('sv-SE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Mest populära ämnen</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Ämne</th>
                <th className="text-left p-2">Antal</th>
              </tr>
            </thead>
            <tbody>
              {topTopics.map((topic) => (
                <tr key={topic.topic} className="hover:bg-gray-50">
                  <td className="p-2">{topic.topic}</td>
                  <td className="p-2">{topic.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify({
              environment: {
                hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
                nodeEnv: process.env.NODE_ENV
              },
              blobs: blobs.length,
              totalLogs: usageLogs.length,
              logs: usageLogs
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 