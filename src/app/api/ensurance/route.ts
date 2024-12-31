import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get('chain');
  const tokenId = searchParams.get('tokenId');

  if (!chain) {
    return NextResponse.json({ error: 'Chain parameter is required' }, { status: 400 });
  }

  try {
    // If tokenId is provided, get single token details
    if (tokenId) {
      const result = await sql.query(`
        SELECT 
          token_id,
          name,
          description,
          image_ipfs,
          animation_url_ipfs,
          creator_reward_recipient,
          creator_reward_recipient_split,
          mime_type
        FROM ensurance_${chain}
        WHERE token_id = $1
      `, [tokenId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Token not found' }, { status: 404 });
      }

      const token = result.rows[0];
      return NextResponse.json({
        ...token,
        chain,
        image_url: token.image_ipfs ? `https://ipfs.io/ipfs/${token.image_ipfs}` : null,
        video_url: token.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${token.animation_url_ipfs}` : null,
        audio_url: token.mime_type?.startsWith('audio/') ? `https://ipfs.io/ipfs/${token.animation_url_ipfs}` : null,
        mime_type: token.mime_type
      });
    }

    // Otherwise get all tokens (existing list view logic)
    const result = await sql.query(`
      SELECT 
        token_id,
        name,
        description,
        image_ipfs,
        animation_url_ipfs,
        creator_reward_recipient,
        creator_reward_recipient_split,
        mime_type
      FROM ensurance_${chain}
      ORDER BY token_id ASC
    `);
    
    const assets = result.rows.map(row => ({
      ...row,
      chain,
      collection: { name: 'Ensurance' },
      nft_id: `${chain}-${row.token_id}`,
      image_url: row.image_ipfs ? `https://ipfs.io/ipfs/${row.image_ipfs}` : null,
      video_url: row.mime_type?.startsWith('video/') ? `https://ipfs.io/ipfs/${row.animation_url_ipfs}` : null,
      contract_address: 'ensurance'
    }));

    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error fetching ensurance:', error);
    return NextResponse.json({ error: 'Failed to fetch ensurance data' }, { status: 500 });
  }
} 