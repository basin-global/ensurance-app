import ImageSwarm from '@/modules/shared/ImageSwarm'
import Link from 'next/link'
import { headers } from 'next/headers'

// Helper function to determine article
function getArticle(word: string) {
  // Get the first letter after the dot
  const firstLetter = word.substring(1).charAt(0).toLowerCase()
  // Check if it starts with a vowel sound
  return 'aeiou'.includes(firstLetter) ? 'an' : 'a'
}

async function getAgents() {
  const headersList = headers()
  const host = headersList.get('host') || ''
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`
  
  const res = await fetch(`${baseUrl}/api/accounts`, {
    next: { revalidate: 3600 } // Cache for 1 hour
  })
  
  if (!res.ok) {
    throw new Error('Failed to fetch agents')
  }

  const accounts = await res.json()
  
  return accounts
    .filter((account: any) => account.is_agent)
    .map((account: any) => ({
      tokenId: account.token_id,
      groupName: account.og_name.substring(1),
      title: account.full_account_name,
      description: `${getArticle(account.og_name)} ${account.og_name} agent`,
    }))
}

export default async function OnchainAgents() {
  const agentImages = await getAgents()

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 relative text-center">
        <h1 className="text-4xl font-bold mb-4">onchain .ai agents</h1>
        <Link 
          href="https://x.com/onchain_agents" 
          target="_blank"
          className="text-blue-400 hover:text-blue-300 transition-colors font-mono"
        >
          get early access
        </Link>
      </div>
      <ImageSwarm images={agentImages} />
    </main>
  )
}
