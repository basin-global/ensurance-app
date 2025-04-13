import { sql } from '@vercel/postgres'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Details from '@/modules/general/Details'
import { PageHeader } from '@/components/layout/PageHeader'
import VerificationSection from '@/components/layout/verifications/VerificationSection'
import { SplitsWrapper } from '@/providers/splits-provider'
import { Metadata } from 'next'

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
    title: `${certificate.name} | Ensurance`,
    description: `View and trade ${certificate.name} certificate on Ensurance`,
  }
}

export default async function GeneralCertificateDetails({ 
  params 
}: { 
  params: { contract: string } 
}) {
  // Get immutable data from DB
  const dbResult = await sql`
    SELECT name, token_uri, contract_address, payout_recipient, provenance, initial_supply
    FROM certificates.general 
    WHERE contract_address = ${params.contract}
  `
  const certificate = dbResult.rows[0]
  if (!certificate) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader 
        title="general ensurance"
        showSearch={false}
        showBackArrow={true}
        backLink="/general"
      />
      
      <div className="container mx-auto px-4 flex-1 pb-12">
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

      <VerificationSection 
        type="general"
        name={certificate.name}
        contractAddress={certificate.contract_address}
      />
    </div>
  )
}