'use client'

import Link from 'next/link'
import useSWR from 'swr'
import OperatorVerification from './OperatorVerification'

interface Props {
  name: string
  group: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

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

  // TODO(TMO): Fix spacing issue between verification section and gradient line in account page layout
  return (
    <div className="text-[12px] flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <Link
          href={`https://basescan.org/token/${groupData.contract_address}#code`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          group
        </Link>
        <Link
          href={`https://basescan.org/nft/${groupData.contract_address}/${accountData.token_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          account
        </Link>
      </div>
      <div className="flex gap-2">
        <Link
          href={`https://opensea.io/assets/base/${groupData.contract_address}/${accountData.token_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          opensea
        </Link>
        <Link
          href={`https://rarible.com/token/base/${groupData.contract_address}:${accountData.token_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          rarible
        </Link>
        <Link
          href={`https://tokenbound.org/assets/base/${groupData.contract_address}/${accountData.token_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          tokenbound
        </Link>
      </div>
      <div className="flex gap-2">
        <OperatorVerification 
          name={name}
          group={group}
          tokenId={accountData.token_id}
        />
      </div>
    </div>
  )
} 