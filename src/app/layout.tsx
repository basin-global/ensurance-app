import { spaceGrotesk, spaceMono } from './fonts'
import './globals.css'

export const metadata = {
  title: 'Ensurance',
  description: 'Web3 Insurance Platform',
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
        {children}
      </body>
    </html>
  )
}
