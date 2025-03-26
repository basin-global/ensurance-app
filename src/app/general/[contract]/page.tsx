import { sql } from '@vercel/postgres'
import { notFound } from 'next/navigation'
import Details from '@/modules/general/Details'

export default async function GeneralCertificateDetails({ 
  params 
}: { 
  params: { contract: string } 
}) {
  // Get immutable data from DB
  const dbResult = await sql`
    SELECT name, token_uri, contract_address
    FROM general_certificates 
    WHERE contract_address = ${params.contract}
  `
  const certificate = dbResult.rows[0]
  if (!certificate) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Details
        contractAddress={certificate.contract_address}
        name={certificate.name}
        tokenUri={certificate.token_uri}
      />
    </div>
  )
}