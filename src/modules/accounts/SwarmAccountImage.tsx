'use client';

import Image from 'next/image';
import { useState } from 'react';

interface SwarmAccountImageProps {
  tokenId: string | number;
  groupName: string;
  className?: string;
  size?: 'small' | 'large';
  unoptimized?: boolean;
}

export default function SwarmAccountImage({ 
  tokenId, 
  groupName,
  className = '',
  size = 'small',
  unoptimized = false
}: SwarmAccountImageProps) {
  const [imageSrc, setImageSrc] = useState(
    `https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/${tokenId}.png`
  );

  const handleImageError = () => {
    if (imageSrc.includes(`/${groupName}/${tokenId}.png`)) {
      // Try group's default image
      setImageSrc(`https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/${groupName}/0.png`);
    } else {
      // If group default fails, use global default
      setImageSrc('https://2rhcowhl4b5wwjk8.public.blob.vercel-storage.com/default.png');
    }
  };

  const dimensions = size === 'large' ? 200 : 100;

  return (
    <div className={`relative aspect-square overflow-hidden ${className}`}>
      <Image
        src={imageSrc}
        alt={`Account ${tokenId}`}
        width={dimensions}
        height={dimensions}
        className="object-cover w-full h-full hover:scale-110 transition-transform duration-300 cursor-pointer"
        onError={handleImageError}
        priority
        unoptimized={unoptimized}
      />
    </div>
  );
} 