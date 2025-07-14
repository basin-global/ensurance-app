import { spaceGrotesk, spaceMono } from './fonts'
import './globals.css'
import { PrivyProviderWrapper } from '@/providers/privy-provider'
import { SWRProvider } from '@/providers/swr-provider'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import WebAnalytics from '@/components/analytics/WebAnalytics'
import AnnouncementBanner from '@/components/layout/AnnouncementBanner'
import MobileNotificationModal from '@/components/layout/MobileNotificationModal'
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify'
import { Metadata } from 'next'
import { generateShare } from '@/lib/share'
import { headers } from 'next/headers'
import '@/config/zora'

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || '/'
  return generateShare(pathname, params)
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <head>
        <WebAnalytics />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-grotesk bg-black text-white overflow-x-hidden">
        <PrivyProviderWrapper>
          <SWRProvider>
            <AnnouncementBanner />
            <MobileNotificationModal />
            <Header />
            <ToastContainer 
              theme="dark"
              position="top-right"
              toastClassName="!bg-gray-900 !text-gray-100 !max-w-[90vw] md:!max-w-md"
              progressClassName="!bg-blue-500"
              closeButton={false}
              limit={3}
            />
            <main className="flex-1 w-full max-w-[100vw]">
              {children}
            </main>
            <Footer />
          </SWRProvider>
        </PrivyProviderWrapper>
        <div id="modal-root" className="relative z-50" />
      </body>
    </html>
  )
}
