// components/AccountImage.tsx
'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface AccountImageProps {
  tokenId: string | number;
  groupName: string;
  variant?: 'circle' | 'square';
  className?: string;
}

export default function AccountImage({ 
  tokenId, 
  groupName,
  variant = 'circle',
  className = ''
}: AccountImageProps) {
  const [imageExists, setImageExists] = useState(false);
  const primaryImageUrl = `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/${tokenId}.png`;

  useEffect(() => {
    // Check if image exists
    fetch(primaryImageUrl, { method: 'HEAD' })
      .then(res => {
        setImageExists(res.ok);
      })
      .catch(() => {
        setImageExists(false);
      });
  }, [primaryImageUrl]);

  if (!imageExists) {
    return null;
  }

  return (
    <div className={`relative h-full aspect-square overflow-hidden ${
      variant === 'circle' ? 'rounded-full' : 'rounded-lg'
    } ${className}`}>
      <Image
        src={primaryImageUrl}
        alt={`Account ${tokenId}`}
        fill
        className="object-cover"
        priority
      />
    </div>
  );
}