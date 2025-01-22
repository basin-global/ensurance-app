import { spaceGrotesk, spaceMono } from './fonts'
import './globals.css'
import { PrivyProviderWrapper } from '@/providers/privy-provider'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { DeclarativeSection } from '@/components/layout/DeclarativeSection'
import { DeclarativeHero } from '@/components/layout/DeclarativeHero'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ensurance agents',
  description: 'Ensuring Nature & the Benefits It Provides'
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
        <PrivyProviderWrapper>
          <Header />
          <ToastContainer 
            theme="dark"
            position="top-right"
            toastClassName="!bg-gray-900 !text-gray-100"
            progressClassName="!bg-blue-500"
            closeButton={false}
          />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </PrivyProviderWrapper>
        <div id="modal-root" />
      </body>
    </html>
  )
}
