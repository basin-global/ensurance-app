'use client'

import { EnsureMagnet } from '@/modules/ensure/EnsureMagnet'
import { DeclarativeHero } from '@/components/layout/DeclarativeHero'
import { DeclarativeSection } from '@/components/layout/DeclarativeSection'
import { useEffect } from 'react'

export default function HomePage() {
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const header = document.querySelector('header')
      
      if (header) {
        // Add fixed positioning and high z-index only on home page
        header.style.position = 'fixed'
        header.style.top = '0'
        header.style.zIndex = '100'
        
        // Start fading in when we're closer to the DeclarativeHero section
        if (scrollPosition > windowHeight * 0.7) {
          header.style.opacity = '1'
          header.style.backgroundColor = 'black'
        } else {
          header.style.opacity = '0'
          header.style.backgroundColor = 'transparent'
        }
      }
    }

    // Set initial state
    const header = document.querySelector('header')
    if (header) {
      header.style.position = 'fixed'
      header.style.top = '0'
      header.style.zIndex = '100'
      header.style.opacity = '0'
      header.style.backgroundColor = 'transparent'
    }
    handleScroll()

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      // Clean up styles when leaving home page
      const header = document.querySelector('header')
      if (header) {
        header.style.position = ''
        header.style.top = ''
        header.style.zIndex = ''
        header.style.opacity = ''
        header.style.backgroundColor = ''
      }
    }
  }, [])

  return (
    <main>
      <EnsureMagnet />
      <DeclarativeHero />
      <DeclarativeSection />
    </main>
  )
}
