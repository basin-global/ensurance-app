import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Asset } from '@/types';
import { AssetDisplay } from './AssetDisplay';
import { AssetMetadata } from './AssetMetadata';

interface AssetDetailViewProps {
  asset: Asset;
  isSpam?: boolean;
  children?: React.ReactNode; // For additional components like Ensure button
  className?: string;
}

export function AssetDetailView({ 
  asset, 
  isSpam,
  children,
  className = ''
}: AssetDetailViewProps) {
  const router = useRouter();

  // Get animation URL from either the direct field or extra metadata
  const animationUrl = asset.animation_url || asset.extra_metadata?.animation_original_url;

  return (
    <div className={`min-h-screen bg-background dark:bg-background-dark ${className}`}>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
        </div>

        {/* Spam Warning */}
        {isSpam && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Warning!</strong>
            <span className="block sm:inline"> This contract has been marked as spam.</span>
          </div>
        )}
        
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 mx-auto">
          {/* Left Column - Media */}
          <div className="lg:w-[58%]">
            <AssetDisplay
              imageUrl={asset.image_url}
              videoUrl={asset.video_url}
              audioUrl={asset.audio_url}
              animationUrl={animationUrl}
              mimeType={asset.mime_type}
              name={asset.name}
            />
          </div>

          {/* Right Column - Info */}
          <div className="lg:w-[36%]">
            <div className="flex flex-col h-full">
              <AssetMetadata
                name={asset.name}
                description={asset.description}
              />
              
              {/* Additional Components (e.g., Ensure button for certificates) */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 