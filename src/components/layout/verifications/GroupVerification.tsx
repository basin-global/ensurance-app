'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { baseVerifyLinkStyle } from '../BasedOnchain'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Props {
  name: string
}

export default function GroupVerification({ name }: Props) {
  const { data: groupData } = useSWR(
    `/api/groups?group_name=${encodeURIComponent(name.startsWith('.') ? name : `.${name}`)}`,
    fetcher,
    { 
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 
    }
  )

  if (!groupData?.contract_address) return null

  return (
    <Link
      href={`https://basescan.org/token/${groupData.contract_address}#readContract`}
      target="_blank"
      rel="noopener noreferrer"
      className={baseVerifyLinkStyle}
    >
      group
    </Link>
  )
} 