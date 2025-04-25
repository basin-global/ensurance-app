import { NextRequest, NextResponse } from 'next/server'
import { specificContract } from '@/modules/specific/config/ERC1155'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const { tokenId } = params

    // For contract metadata (tokenId 0) - not in use yet - TODO
    if (tokenId === '0') {
      return NextResponse.json({
        name: 'Specific Certificates',
        description: 'Specific Certificates for Natural Capital',
        image: `${process.env.NEXT_PUBLIC_APP_URL}/api/specific/0.png`,
        external_link: `${process.env.NEXT_PUBLIC_APP_URL}/specific`,
      })
    }

    // Get metadata from database
    const { rows } = await sql`
      SELECT name, description, image, animation_url, mime_type
      FROM certificates.specific
      WHERE token_id = ${Number(tokenId)}
      AND chain = ${specificContract.network.name.toLowerCase()}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    const metadata = rows[0]

    return NextResponse.json({
      name: metadata.name,
      description: metadata.description || 'A Specific Certificate for Natural Capital',
      image: metadata.image,
      animation_url: metadata.animation_url,
      content: {
        mime: metadata.mime_type,
        uri: metadata.animation_url || metadata.image
      }
    })
  } catch (error) {
    console.error('[Metadata API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get metadata' },
      { status: 500 }
    )
  }
} 