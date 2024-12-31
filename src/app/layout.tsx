import { spaceGrotesk, spaceMono } from './fonts'
import './globals.css'
import { PrivyProviderWrapper } from '@/providers/privy-provider'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { SiteProvider } from '@/contexts/site-context'
import { SiteWrapper } from '@/components/layout/SiteWrapper'
import { headers } from 'next/headers'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const hostname = headers().get('host') || ''
  const pathname = headers().get('x-pathname') || ''
  
  // Use same logic as site-context
  const isOnchainAgents = 
    hostname === 'onchain-agents.ai' || 
    pathname.startsWith('/site-onchain-agents')

  if (isOnchainAgents) {
    return {
      title: 'onchain .ai agents',
      description: 'Onchain Agents for Everyone',
    }
  }

  return {
    title: 'ensurance agents',
    description: 'Ensuring Nature & the Benefits It Provides',
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="antialiased min-h-screen flex flex-col font-grotesk">
        <SiteProvider>
          <SiteWrapper>
            <PrivyProviderWrapper>
              <Header />
              <ToastContainer 
                theme="dark"
                position="top-right"
                toastClassName={`!bg-gray-900 !text-gray-100 ${spaceMono.variable}`}
                className={`${spaceMono.variable} !font-mono`}
                progressClassName="!bg-blue-500"
                closeButton={false}
              />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </PrivyProviderWrapper>
          </SiteWrapper>
        </SiteProvider>
      </body>
    </html>
  )
}
