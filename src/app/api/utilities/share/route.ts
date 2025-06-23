import { NextRequest, NextResponse } from 'next/server'
import { ImageResponse } from 'next/og'
import { put } from '@vercel/blob'
import { createHash } from 'crypto'
import React from 'react'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('image')
    const title = searchParams.get('title') || ''
    const type = searchParams.get('type') || 'default'
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'image parameter required' }, { status: 400 })
    }

    // Generate hash for caching
    const hash = createHash('md5').update(`${imageUrl}-${title}-${type}`).digest('hex')
    const ogPath = `og/${type}/${hash}.png`
    const existingUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${ogPath}`
    
    // Check if already exists
    try {
      const existingResponse = await fetch(existingUrl, { method: 'HEAD' })
      if (existingResponse.ok) {
        return NextResponse.json({ url: existingUrl, cached: true })
      }
    } catch {
      // Will generate new image
    }

    // Generate landscape OpenGraph image  
    const imageResponse = new ImageResponse(
      React.createElement('div', {
        style: {
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
          display: 'flex',
          alignItems: 'center',
          padding: '60px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      },
        React.createElement('div', {
          style: {
            width: '400px',
            height: '400px',
            borderRadius: '20px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#333'
          }
        },
          React.createElement('img', {
            src: imageUrl,
            width: 400,
            height: 400,
            style: {
              objectFit: 'cover',
              width: '100%',
              height: '100%'
            }
          })
        ),
        React.createElement('div', {
          style: {
            marginLeft: '60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: '600px',
            height: '400px'
          }
        },
          React.createElement('div', {
            style: {
              color: 'white',
              fontSize: title.length > 50 ? '36px' : title.length > 30 ? '42px' : '48px',
              fontWeight: 'bold',
              lineHeight: 1.2,
              marginBottom: '20px',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }
          }, title),
          React.createElement('div', {
            style: {
              color: '#888',
              fontSize: '24px',
              fontWeight: 'normal'
            }
          }, 'ensurance.app')
        )
      ),
      { width: 1200, height: 630 }
    )

    const buffer = await imageResponse.arrayBuffer()
    const { url } = await put(ogPath, Buffer.from(buffer), { 
      access: 'public',
      addRandomSuffix: false 
    })

    return NextResponse.json({ url, cached: false })

  } catch (error) {
    console.error('OpenGraph image generation failed:', error)
    return NextResponse.json({ 
      url: 'https://ensurance.app/assets/share-default.png',
      error: 'Failed to generate OpenGraph image, using fallback'
    })
  }
} 