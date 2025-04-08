import GeneralGrid from '@/modules/general/GeneralGrid'
import { Metadata } from 'next'
import FarcasterProvider from '@/components/FarcasterProvider'

export const metadata: Metadata = {
  title: 'General Ensurance Certificates',
  description: 'View and trade general ensurance certificates',
}

export default function MiniAppGeneralPage() {
  return (
    <FarcasterProvider>
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-6">General Certificates</h1>
          <GeneralGrid 
            searchQuery=""
            onDataChange={() => {}}
            isMiniApp={true}
          />
        </div>
      </div>
    </FarcasterProvider>
  )
} 