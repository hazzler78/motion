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

  // Hämta alla loggfiler
  const { blobs } = await list({
    prefix: 'usage/',
    limit: 100,
    token: process.env.BLOB_READ_WRITE_TOKEN
  })

  console.log('Found blobs:', blobs.map(b => ({ url: b.url, pathname: b.pathname })))

  // Läs innehållet i varje fil
  const usageLogs: UsageLog[] = []
  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url, {
        headers: {
          'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
      })
      if (!response.ok) {
        console.error(`Failed to fetch ${blob.url}:`, response.status, response.statusText)
        continue
      }
      const data = await response.json()
      console.log('Blob data:', { url: blob.url, data })
      if (data.userId && (data.email || data.topic)) {  // Verifiera att vi har valid data
        usageLogs.push(data)
      } else {
        console.error('Invalid data structure:', data)
      }
    } catch (error) {
      console.error(`Error fetching ${blob.url}:`, error)
    }
  }

  // Beräkna statistik
  const totalUsers = new Set(usageLogs.map(log => log.userId)).size
  const totalUsage = usageLogs.length

  // Sortera efter datum och ta de 10 senaste
  const recentUsage = usageLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

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
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left p-2">Användare</th>
                <th className="text-left p-2">Ämne</th>
                <th className="text-left p-2">Datum</th>
              </tr>
            </thead>
            <tbody>
              {recentUsage.map((usage) => (
                <tr key={usage.timestamp} className="hover:bg-gray-50">
                  <td className="p-2">{usage.email || usage.userId}</td>
                  <td className="p-2">{usage.topic}</td>
                  <td className="p-2">{new Date(usage.timestamp).toLocaleDateString('sv-SE')}</td>
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
            {JSON.stringify({ totalLogs: usageLogs.length, blobs: blobs.length }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 