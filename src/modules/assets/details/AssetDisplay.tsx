import { useState } from 'react';
import Image from 'next/image';
import { Maximize2, Minimize2 } from 'lucide-react';
import CustomAudioPlayer from '@/modules/media/CustomAudioPlayer';

interface AssetDisplayProps {
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  animationUrl?: string;
  mimeType?: string;
  name?: string;
}

export function AssetDisplay({ imageUrl, videoUrl, audioUrl, animationUrl, mimeType, name }: AssetDisplayProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    document.body.style.overflow = !isFullscreen ? 'hidden' : 'auto';
  };

  // Simplify audio condition to match old working version
  const shouldShowAudio = mimeType?.startsWith('audio/') && audioUrl;
  console.log('Audio Conditions:', { mimeType, audioUrl, shouldShowAudio });

  if (isFullscreen) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black cursor-pointer"
        onClick={toggleFullscreen}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {videoUrl ? (
            <video
              className="max-h-screen max-w-screen object-contain"
              controls
              autoPlay
              loop
              muted
              src={videoUrl}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="relative w-full h-full">
              <Image
                src={imageUrl || ''}
                alt={name || 'Asset Image'}
                fill
                className="object-contain"
                priority
              />
              {shouldShowAudio && (
                <div 
                  className="absolute bottom-8 left-8 right-8 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CustomAudioPlayer src={audioUrl!} />
                </div>
              )}
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white"
          >
            <Minimize2 size={24} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-background dark:bg-background-dark rounded-2xl">
      {videoUrl ? (
        <div className="relative w-full">
          <div 
            className="group cursor-pointer"
            onClick={toggleFullscreen}
          >
            <video
              className="w-full object-contain rounded-2xl"
              controls
              autoPlay
              loop
              muted
              src={videoUrl}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Maximize2 size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full">
          <div 
            className="group cursor-pointer"
            onClick={toggleFullscreen}
          >
            <div className="relative w-full">
              <Image
                src={imageUrl || ''}
                alt={name || 'Asset Image'}
                width={1200}
                height={675}
                className="w-full h-auto rounded-2xl object-contain"
                priority
              />
              {shouldShowAudio && (
                <div 
                  className="absolute bottom-8 left-8 right-8 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CustomAudioPlayer src={audioUrl!} />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="absolute top-4 right-4 z-30 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Maximize2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 