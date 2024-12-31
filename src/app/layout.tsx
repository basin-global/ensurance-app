import { spaceGrotesk, spaceMono } from './fonts'
import './globals.css'
import { PrivyProviderWrapper } from '@/providers/privy-provider'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { SiteProvider } from '@/contexts/site-context'
import { SiteWrapper } from '@/components/layout/SiteWrapper'

export const metadata = {
  title: 'onchain agents',
  description: 'onchain ai agents for everyone',
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
              <ToastContainer />
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
