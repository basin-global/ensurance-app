import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const tokenId = formData.get('tokenId') as string

    if (!file || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'image/png') {
      return NextResponse.json(
        { error: 'Only PNG images are supported' },
        { status: 400 }
      )
    }

    // Upload file
    const { url } = await put(`specific-ensurance/${tokenId}.png`, file, {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    )
  }
} 