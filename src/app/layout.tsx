import { spaceGrotesk, spaceMono } from './fonts'
import './globals.css'
import { PrivyProviderWrapper } from '@/providers/privy-provider'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { Metadata } from 'next'
import { generateShare } from '@/lib/share'
import { headers } from 'next/headers'

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || '/'
  return generateShare(pathname, params)
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
