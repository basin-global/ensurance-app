import { sql } from '@vercel/postgres'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Details from '@/modules/general/Details'
import { PageHeader } from '@/components/layout/PageHeader'
import VerificationSection from '@/components/layout/verifications/VerificationSection'

// Tell Next.js this is a dynamic route
export const dynamic = 'force-dynamic'

export default async function GeneralCertificateDetails({ 
  params 
}: { 
  params: { contract: string } 
}) {
  // Get immutable data from DB
  const dbResult = await sql`
    SELECT name, token_uri, contract_address
    FROM certificates.general 
    WHERE contract_address = ${params.contract}
  `
  const certificate = dbResult.rows[0]
  if (!certificate) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Link href="/general" className="block mb-8">
        <div className="flex justify-center items-center gap-3 group pt-8">
          <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
          <PageHeader 
            title="general ensurance"
            showSearch={false}
          />
        </div>
      </Link>
      
      <div className="container mx-auto px-4 flex-1">
        <Details
          contractAddress={certificate.contract_address}
          name={certificate.name}
          tokenUri={certificate.token_uri}
        />
      </div>
      <VerificationSection 
        type="general"
        name={certificate.name}
        contractAddress={certificate.contract_address}
      />
    </div>
  )
}