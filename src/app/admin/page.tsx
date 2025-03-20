'use client'

import { Card } from '@/components/ui/card'
import { usePrivy } from '@privy-io/react-auth'
import Link from 'next/link'

export default function AdminPage() {
  const { user } = usePrivy()

  if (!user?.wallet?.address) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Please connect your wallet to access admin features.</p>
      </div>
    )
  }

  const adminLinks = [
    {
      title: 'Sync',
      description: 'Synchronize data between blockchain and database',
      href: '/admin/sync',
    },
    {
      title: 'Exports',
      description: 'Export data and generate reports',
      href: '/admin/exports',
    },
  ]

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminLinks.map((link) => (
          <Link href={link.href} key={link.href}>
            <Card className="p-6 hover:bg-gray-800 transition-colors cursor-pointer">
              <h2 className="text-xl font-semibold mb-2 text-white">{link.title}</h2>
              <p className="text-gray-400">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
} 