import { sql } from '@vercel/postgres'
import { notFound } from 'next/navigation'
import Details from '@/modules/general/Details'
import { SplitsWrapper } from '@/providers/splits-provider'
import { Metadata } from 'next'
import FarcasterProvider from '@/components/FarcasterProvider'

// Tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { contract: string } }): Promise<Metadata> {
  const dbResult = await sql`
    SELECT name, token_uri, contract_address
    FROM certificates.general 
    WHERE contract_address = ${params.contract}
  `
  const certificate = dbResult.rows[0]
  if (!certificate) return {}
  
  return {
    title: `${certificate.name}`,
    description: `View and trade ${certificate.name} certificate`,
  }
}

export default async function MiniAppCertificateDetails({ 
  params 
}: { 
  params: { contract: string } 
}) {
  console.log('Mini App Certificate Details loading:', params.contract)
  
  // Get immutable data from DB
  const dbResult = await sql`
    SELECT name, token_uri, contract_address, payout_recipient, provenance, initial_supply
    FROM certificates.general 
    WHERE contract_address = ${params.contract}
  `
  const certificate = dbResult.rows[0]
  if (!certificate) {
    console.log('Certificate not found')
    notFound()
  }

  console.log('Certificate found:', certificate.name)

  return (
    <FarcasterProvider>
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="container mx-auto px-4 py-4 flex-1">
          <SplitsWrapper>
            <Details
              contractAddress={certificate.contract_address}
              name={certificate.name}
              tokenUri={certificate.token_uri}
              payout_recipient={certificate.payout_recipient}
              provenance={certificate.provenance}
              initial_supply={certificate.initial_supply}
            />
          </SplitsWrapper>
        </div>
      </div>
    </FarcasterProvider>
  )
} 