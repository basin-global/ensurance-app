'use client'

import Link from 'next/link'
import useSWR from 'swr'
import NftLinks from './NftLinks'
import { baseVerifyLinkStyle } from '../BasedOnchain'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Props {
  name: string
  group: string
}

export default function AccountVerification({ name, group }: Props) {
  const { data: groupData } = useSWR(
    `/api/groups?group_name=${encodeURIComponent(group.startsWith('.') ? group : `.${group}`)}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 
    }
  )

  const { data: accountData } = useSWR(
    `/api/accounts/${encodeURIComponent(name)}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 
    }
  )

  if (!groupData?.contract_address || !accountData?.token_id) return null

  return (
    <div className="flex flex-col gap-1.5">
      {/* Group and Account line */}
      <div className="flex justify-center gap-2">
        <Link
          href={`https://basescan.org/token/${groupData.contract_address}#code`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          group
        </Link>
        <Link
          href={`https://basescan.org/nft/${groupData.contract_address}/${accountData.token_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseVerifyLinkStyle}
        >
          account
        </Link>
      </div>

      {/* NFT marketplaces line */}
      <NftLinks 
        contractAddress={groupData.contract_address}
        tokenId={accountData.token_id}
        showTokenbound={true}
      />
    </div>
  )
} 